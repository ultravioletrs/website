.PHONY: help install dev build preview check clean

install:
	pnpm install

dev:
	pnpm run dev

build:
	pnpm run build

preview:
	pnpm run preview

check:
	pnpm astro check

clean:
	rm -rf dist
	rm -rf node_modules
