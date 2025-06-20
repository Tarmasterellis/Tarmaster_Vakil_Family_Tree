import { PrismaClient } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(prisma),
	providers: [ GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })], 
	session: { strategy: "jwt" },
	pages: { signIn: "/signin" },
	secret: process.env.NEXTAUTH_SECRET,
	callbacks: {
		async session({ session, token }) { if (session?.user && token.sub) session.user.id = token.sub; return session; },
		async jwt({ token, user }) { if (user) token.id = user.id; return token; },
	},
};
