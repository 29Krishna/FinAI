import { PrismaClient } from "@prisma/client";

export const db = globalThis.prisma || new PrismaClient()

if(process.env.NODE_ENV !== "production"){
    globalThis.prisma = db
}

//globalThis.prisma: this global variable ensures that the prisma client instance is reused across reloads during deployment.
// without this, a new instance of prisma client is created with each reload 

