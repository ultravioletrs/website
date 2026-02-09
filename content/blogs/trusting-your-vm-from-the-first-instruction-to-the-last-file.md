---
slug: trusting-your-vm-from-the-first-instruction-to-the-last-file
title: "Trusting Your VM from the First Instruction to the Last File"
excerpt: "COCOS AI leverages several mechanism in order to build a continous chain of trust from the very first instruction executed during boot to the last file loaded into memory."
description: "Learn about secured bot, measured boot, TPM and Linux IMA in the context of COCOS AI."
author:
  name: "Jovan Djukic"
  picture: "https://avatars.githubusercontent.com/u/44265300?v=4"
tags: [confidential-computing, secured boot, measured boot, TPM, Linux IMA, cocos]
date: 2026-02-09
image: /img/trusting-your-vm-from-the-first-instruction-to-the-last-file/overview.png
ogImage: /img/trusting-your-vm-from-the-first-instruction-to-the-last-file/overview.png
featured: true
---

![](/img/trusting-your-vm-from-the-first-instruction-to-the-last-file/overview.png)

### Introduction 

With the rise of **Trusted Execution Environments (TEEs)**, cloud users
can now provision virtual machines with the strong guarantee that all
*data in use* remains encrypted. This advancement protects sensitive
workloads against exposure, even if the underlying infrastructure is
compromised.

However, encryption alone does not solve the entire trust problem. Since
the majority of the software stack - from firmware to operating system
components - is provided and managed by the **Cloud Service Provider
(CSP)**, users still need a reliable way to ensure that no untrusted or
malicious software is running inside their virtual machine.

In this article, I describe how **COCOS AI \[1\]** addresses this
challenge. The solution combines three complementary
technologies - **Secure Boot, Measured Boot, and Linux Integrity
Measurement Architecture (IMA)** - to build a continuous chain of
trust from the very first instruction executed during boot to the last
file loaded into memory.

#### Secure Boot: Verifying the Kernel at Startup 

**Secure Boot \[2\]** ensures that the firmware will load only **signed
kernels**. The kernel is signed with a private key, while the firmware
holds the corresponding public key. During boot, the firmware verifies
the kernel's signature before execution. If the kernel has been tampered
with or replaced, the signature check fails, and the boot process is
halted.

This mechanism guarantees that only kernels explicitly approved by the
system owner can run, preventing unauthorized modifications at the
earliest stage of the boot process.

#### Measured Boot: Creating a Verifiable Record 

While Secure Boot enforces integrity, **Measured Boot \[3\]** records
integrity. At each stage of the boot process (firmware, bootloader,
kernel, etc.), components are **measured** (hashed using a cryptographic
hash function such as SHA-256). These measurements are extended into
special registers inside the **Trusted Platform Module (TPM)**, called
**Platform Configuration Registers (PCRs)**.

Each PCR is updated using the formula:

``` 
PCR[i] = Hash(PCR[i] || ComponentHash)
```

This chaining mechanism means that even a small change in one component
produces a completely different final PCR value. As a result, users (or
remote attestation services) can later verify the expected state of the
system by comparing PCR values against a known baseline.

Measured Boot therefore provides **tamper-evidence**: it doesn't stop
malicious code from executing, but it guarantees that any modification
will be detectable.

#### Linux IMA: Extending Trust Beyond Boot 

Measured Boot covers integrity only up until the kernel is loaded. But
what about the rest of the software stack - drivers, shared libraries,
or application binaries - that are brought into memory after boot?

This is where the **Linux Integrity Measurement Architecture
(IMA)\[4\]** comes in. IMA continuously measures files as they are
loaded into RAM, including both executables and data files. The
resulting measurements are logged in a text file (the IMA measurement
list) that can be used to verify system integrity after boot.

In other words, IMA closes the gap by ensuring that no unauthorized or
malicious code sneaks in after the kernel has taken over. Together with
Secure Boot and Measured Boot, it forms a **complete trust chain**:

-   Secure Boot verifies what runs.
-   Measured Boot records what ran.
-   IMA monitors what continues to run.

By combining Secure Boot, Measured Boot, and Linux IMA, **COCOS AI**
provides a comprehensive way to ensure that virtual machines are both
encrypted and verifiably trustworthy. This layered approach establishes
confidence not only in the confidentiality of your data, but also in the
integrity of the entire software stack - from the very first
instruction of boot to the last file loaded during runtime.

``` 
[Secure Boot] → [Measured Boot] → [Linux IMA]
  "Verifies"       "Records"       "Monitors"
  Kernel sigs      Boot hashes    Files at runtime
```

In the rest of this article I will describe how to achieve this "chain"
of trust using open source components. The whole process will be done on
AMD SEV-SNP CPU.

### COCONUT Secure VM Service Module 

The core part of this process is **COCONUT SVSM \[5\]**. This software
which aims to provide secure services and device emulations to guest
operating systems in confidential virtual machines (CVMs). It requires
AMD Secure Encrypted Virtualization with Secure Nested Paging (AMD
SEV-SNP), especially the VM Privilege Level (VMPL) feature.

#### Guest firmware 

Firstly, we need to build the firmware. A special **OVMF** build is
required to launch a guest on top of the **COCONUT-SVSM**. To build the
**OVMF** binary for the guest, first checkout this repository:

``` 
$ git clone https://github.com/coconut-svsm/edk2.git
$ cd edk2/
$ git checkout svsm
$ git submodule init
$ git submodule update
```

Before building we need to make a few changes. This firmware starts an
emulated software **TPM** in **VMPL0**. However this emulated **TPM**
does not support **SHA1 PCR** bank. This register bank is needed to
verify the measurements produced by the **Linux IMA**. To enable this
bank we need to make a few modifications to the source code:

The following line needs to be added to
*SecurityPkg/Tcg/Tcg2Dxe/Tcg2Dxe.inf* file at the end of the *Pcd*
section:

``` 
gEfiSecurityPkgTokenSpaceGuid.PcdTpm2HashMask
```

The following line needs to be added to *OvmfPkg/OvmfPkgX64.dsc* file at
the end of the *PcdsDynamicDefault* section:

``` 
gEfiSecurityPkgTokenSpaceGuid.PcdTpm2HashMask|0x0000000C
```

These lines enable the **SHA1** bank. After the changes have been made,
we need to build the firmware:

``` 
$ export PYTHON3_ENABLE=TRUE
$ export PYTHON_COMMAND=python3
$ make -j16 -C BaseTools/
$ source ./edksetup.sh --reconfig
$ build -a X64 -b DEBUG -t GCC5 -D DEBUG_ON_SERIAL_PORT -D DEBUG_VERBOSE -D TPM2_ENABLE -D SECURE_BOOT_ENABLE -p OvmfPkg/OvmfPkgX64.dsc
```

This will build the **OVMF** binary that will be packaged into the
**IGVM** \[7\] file to use with QEMU.

#### Generating the secure boot keys 

Secure Boot relies on a **chain of trust** anchored in cryptographic
keys stored in the firmware. These keys define *who* is trusted to
update firmware settings, *who* can sign software, and *which binaries*
are allowed or denied during boot.

The three most important keys are Platform Key (PK), Key Exchange Key
(KEK) and Signature Database Key (DB).

In the Secure Boot process, the **Platform Key (PK)** serves as the root
of trust for the system. It is typically owned by the original equipment
manufacturer (OEM) or the system administrator, and it establishes
ultimate authority over the Secure Boot configuration. Only the holder
of the PK can authorize changes to the Key Exchange Keys (KEKs), making
it the master key that defines who controls trust on the platform.

The **Key Exchange Key (KEK)** acts as a layer of delegation between the
platform owner and the operating system vendors or administrators.
Instead of the PK being used for everyday updates, KEKs are entrusted
with the responsibility of updating the Secure Boot signature databases.
In practice, this allows OS vendors, such as Microsoft or Linux
distributions, to provide updates that modify which binaries are trusted
or revoked. By signing these updates with a KEK, they can add to or
remove from the trusted lists without requiring the platform owner's PK
for every change.

The **signature database (DB)** is where the trusted software components
are defined. It contains certificates, cryptographic hashes, and
signatures of executables such as bootloaders, kernels, and drivers.
During the boot process, the firmware checks each component against the
DB, and only those that match entries in the database are allowed to
run. In this way, DB acts as a whitelist that ensures only verified
software is executed at boot time.

For this tutorial we will generate all these keys using **openssl**:

``` 
 # PK (self-signed)
 openssl req -x509 -newkey rsa:2048 -nodes \
   -subj "/CN=Demo Platform Key/" \
   -keyout PK.key -out PK.pem

 # KEK (CSR -> signed by PK)
 openssl req -new -newkey rsa:2048 -nodes \
   -subj "/CN=Demo KEK/" \
   -keyout KEK.key -out KEK.csr
 openssl x509 -req -in KEK.csr -days 3650 \
   -CA PK.pem -CAkey PK.key -CAcreateserial -out KEK.pem

 # db (CSR -> signed by KEK). This cert will sign EFI binaries.
 openssl req -new -newkey rsa:2048 -nodes \
   -subj "/CN=Demo db/" \
   -keyout DB.key -out DB.csr
 openssl x509 -req -in DB.csr -days 3650 \
   -CA KEK.pem -CAkey KEK.key -CAcreateserial -out DB.pem

 # Convert to DER (what firmware variables expect)
 openssl x509 -inform PEM -in PK.pem  -outform DER -out PK.cer
 openssl x509 -inform PEM -in KEK.pem -outform DER -out KEK.cer
 openssl x509 -inform PEM -in DB.pem  -outform DER -out DB.cer
```

Now we need to add these keys to firmware. For this we can use the
**virt-firmware \[8\]** tool. Run the following command:

``` 
#!/bin/bash
UUDI=$uuidgen 

virt-fw-vars \
--input <path to OVMF_VARS.fd> \
--output <path to new OVMF_VARS.secure.fd> \
--set-pk   $UUID <path to PK.cer> \
--add-kek  $UUID <path to KEK.cer> \
--add-db   $UUID <path to DB.cer> \
--sb
```

This command will store public keys in **OVMF\_VARS.fd**. You can check
what was written with the following command:

``` 
virt-fw-vars -i OVMF_VARS.secure.fd --print | less
```

#### Combing OVMF\_VARS.fd and OVMF\_CODE.fd 

Now that we made changes to **OVMF\_VARS.fd** wee need to combine the
new **OVMF\_VARS.secure.fd** and **OVMF\_CODE.fd** into a single
**OVMF.fd** file. This file will then be used to generate an **IGVM**
file which will be used to start a VM with **QEMU**.

This is achieved with concatenating the vars and code files. First check
in which order are they concatenated. The EDK2 build already produced an
**OVMF.fd** file which we can use for this purpose:

``` 
cmp <(cat <path to old OVMF_VARS.fd> <path to OVMF_CODE.fd>) <path to old OVMF.fd> && echo "order is VARS+CODE"
```

If the order is vars + code, the following command is going to
concatenate vars and code files:

``` 
cat <path to OVMF_VARS.fd with keys> <path t OVMF_CODE.fd> > <path to new OVMF.secure.fd>
```

#### Building the COCONUT-SVSM IGVM file 

Building the SVSM itself requires:

-   a recent Rust compiler and build environment installed. Please
    refer to <https://rustup.rs/> on how to get this environment
    installed.
-   `x86_64-unknown-none` target
    toolchain installed
    (`rustup target add x86_64-unknown-none`{.markup--code
    .markup--li-code})
-   `binutils`

Then checkout the SVSM repository and build the SVSM binary:

``` 
$ git clone https://github.com/coconut-svsm/svsm
$ cd svsm
$ git submodule update --init
$ FW_FILE=<path to new OVMF.fd> cargo xbuild --release configs/qemu-target.json
```

This will build a **coconut-igvm.igvm** file which will be placed in
**svsm/bin** directory. This file will be used as firmware when starting
the new VM. It will create a software **TPM** in **VPML0**.

### Building a kernel using Buildroot 

If you want to build a basic Linux kernel and minimal root filesystem
with Buildroot, the process is surprisingly straightforward. After
installing the required packages (compilers, libraries, and utilities),
you clone the Buildroot repository. The next step is to configure the
necessary packages. For this you can use the [COCOS AI
configuration](https://github.com/ultravioletrs/cocos/tree/main/hal/linux). To build the kernel (`bzImage`) and an initial RAM file system
(`rootfs.cpio`) checkout the COCOS AI
repository and run the following commands:

``` 
git clone git@github.com:ultravioletrs/cocos.git
git clone git@github.com:buildroot/buildroot.git
cd buildroot
git checkout 2025.05-rc1
make BR2_EXTERNAL=../cocos/hal/linux cocos_defconfig
# Execute 'make menuconfig' only if you want to make additional configuration changes to Buildroot.
make menuconfig
make
```

The kernel and the initial RAM file system can be found in the
`output/` directory. You can then boot
your new kernel with QEMU by pointing it to the kernel image and root
filesystem, appending the right console and root parameters.

There is one additional step. Since we are using the secure boot
feature, we need to sign this kernel:

``` 
 sbsign --key <path to DB.key> --cert <path to DB.pem> bzImage --output bzImage.signed
```

This kernel can be used with generated IGMV file to start the VM.

### Building QEMU 

**COCONUT-SVSM** is packaged during the build into a file conforming to
the **IGVM** format. Current versions of **QEMU** do not support
launching guests using IGVM, but a branch is available that includes
this capability. This will need to be built in order to be able to
launch **COCONUT-SVSM**. Support for **IGVM** within **QEMU** depends on
the **IGVM** library. This will need to be built and installed prior to
building **QEMU**.

``` 
$ git clone https://github.com/microsoft/igvm
$ cd igvm
$ make -f igvm_c/Makefile
$ sudo make -f igvm_c/Makefile install
```

After the build dependencies are installed, clone the **QEMU**
repository and switch to the branch that supports **IGVM**:

``` 
$ git clone https://github.com/coconut-svsm/qemu
$ cd qemu
$ git checkout svsm-igvm
```

Now the right branch is checked out and you can continue with the build.
Feel free to adapt the installation directory to your needs:

``` 
$ ./configure --prefix=$HOME/bin/qemu-svsm/ --target-list=x86_64-softmmu --enable-igvm
$ ninja -C build/
$ make install
```

**QEMU** is now installed and ready to run an **AMD SEV-SNP** guest with
an **SVSM** embedded in an **IGVM** file.

### Starting the VM 

To start and test the VM we can use [COCOS AI manager
component](https://github.com/ultravioletrs/cocos/tree/main/manager). However, to make this testing process a bit simpler,
we will use the newly compiled QEMU and point it to all the necessary
files:

``` 
# $QEMU_BIN -> path to qemu binary
# $IGVM -> path to IGVM binary
# $KERNEL -> path to signed kernel
# $INITRD -> path to init RAM file system

sudo $QEMU_BIN \
  -enable-kvm \
  -cpu host \
  -machine q35,confidential-guest-support=sev0,memory-backend=ram1,igvm-cfg=igvm0 \
  -smp 4,maxcpus=16 \
  -m 25G,slots=5,maxmem=30G \
  -object memory-backend-memfd,id=ram1,size=25G,share=true,prealloc=false,reserve=false \
  -object sev-snp-guest,id=sev0,cbitpos=51,reduced-phys-bits=1 \
  -object igvm-cfg,id=igvm0,file="$IGVM" \
  -device virtio-net-pci,disable-legacy=on,iommu_platform=true,netdev=vmnic,romfile= \
  -netdev user,id=vmnic \
  -kernel $KERNEL \
  -initrd $INITRD \
  -append "console=ttyS0 earlyprintk=ttyS0,115200 ima_policy=tcb" \
  -nographic \
  -monitor unix:monitor,server,nowait
```

The **append** flag appends the string to the kernel command line
parameters. The parameter **ima\_policy=tcb** enables the Linux IMA. In
this mode Linux IMA only measures files that pass through RAM.

If the boot was successful, that means the firmware verified the kernel
signature. When the VM boots, there should be a **/dev/tpm0** folder
which represents the TPM. The Linux IMA measurements can be found in the
**/sys/kernel/security/ima/ascii\_runtime\_measurements** file. The
**SHA1** **PCR10** register can be used to verify the Linux IMA
measurements.

The values of TPM PCRs and the data from
`ascii_runtime_measurements` can be
included in the attestation report to strengthen the machine\'s
verification process.

### **Conclusion** 

In this article, we explored how to launch a custom virtual machine with
**Secure Boot**, **Measured Boot**, and **Linux IMA** enabled. Together,
these features record measurements of boot components and provide
assurance that the VM has started in a trusted, "good state."

Cloud Service Providers (CSPs) typically don't grant this level of
control. For example, on **Google Cloud Platform (GCP)** you cannot
supply your own firmware or kernel. What they do offer, however, is a
way to verify the integrity of the boot process: you can download the
firmware and kernel they provide, inspect them locally, and calculate
their measurements to confirm that what booted in the cloud matches what
you expect.

### Literature 

\[1\] <https://github.com/ultravioletrs/cocos>

\[2\] <https://en.wikipedia.org/wiki/UEFI#Secure_Boot>

\[3\]
<https://tianocore-docs.github.io/edk2-TrustedBootChain/release-1.00/3_TCG_Trusted_Boot_Chain_in_EDKII.html>

\[4\] <https://ima-doc.readthedocs.io/en/latest/ima-concepts.html>

\[5\]<https://github.com/coconut-svsm/svsm>

\[6\] <https://github.com/tianocore/edk2>

\[7\] <https://docs.rs/igvm_defs/0.1.3/igvm_defs/index.html>

\[8\] <https://pypi.org/project/virt-firmware/>