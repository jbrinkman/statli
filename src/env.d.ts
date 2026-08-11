/// <reference types="astro/client" />

declare namespace App {
	interface Locals {
		user: {
			id: string;
			type: "human" | "machine";
		};
	}
}
