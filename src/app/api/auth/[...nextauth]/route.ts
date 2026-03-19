import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
    useSecureCookies: false,
    // No PrismaAdapter — it's incompatible with Prisma v7 driver-adapter client.
    // We use JWT sessions and manage users manually in the callbacks.
    session: {
        strategy: "jwt",
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            checks: [], // Disable PKCE/State for debugging
            authorization: {
                params: {
                    scope: [
                        "openid",
                        "email",
                        "profile",
                        "https://www.googleapis.com/auth/gmail.readonly",
                        "https://www.googleapis.com/auth/gmail.send",
                        "https://www.googleapis.com/auth/gmail.modify",
                        "https://www.googleapis.com/auth/gmail.compose",
                        "https://www.googleapis.com/auth/calendar.events",
                        "https://www.googleapis.com/auth/calendar.freebusy",
                    ].join(" "),
                    access_type: "offline",   // ensures Google returns a refresh_token
                    prompt: "consent",         // forces re-consent so refresh_token is always returned
                },
            },
        }),
    ],
    callbacks: {
        // Called on every sign-in. We upsert the user + tenant here.
        async signIn({ user, account, profile }: any) {
            try {
                if (!user.email) return false;

                // Upsert the User record
                const dbUser = await prisma.user.upsert({
                    where: { email: user.email },
                    update: {
                        name: user.name,
                        image: user.image,
                    },
                    create: {
                        email: user.email,
                        name: user.name,
                        image: user.image,
                    },
                });

                // Upsert an Account record for OAuth token storage
                if (account) {
                    await prisma.account.upsert({
                        where: {
                            provider_providerAccountId: {
                                provider: account.provider,
                                providerAccountId: account.providerAccountId,
                            },
                        },
                        update: {
                            access_token: account.access_token,
                            refresh_token: account.refresh_token,
                            expires_at: account.expires_at,
                            scope: account.scope,
                            id_token: account.id_token,
                        },
                        create: {
                            userId: dbUser.id,
                            type: account.type,
                            provider: account.provider,
                            providerAccountId: account.providerAccountId,
                            access_token: account.access_token,
                            refresh_token: account.refresh_token,
                            expires_at: account.expires_at,
                            token_type: account.token_type,
                            scope: account.scope,
                            id_token: account.id_token,
                        },
                    });
                }

                // Ensure the user has a linked tenant
                let tenant = await prisma.tenant.findFirst({
                    where: { email: user.email },
                });

                if (!tenant) {
                    tenant = await prisma.tenant.create({
                        data: {
                            name: `${user.name || 'New'} Org`,
                            email: user.email,
                        },
                    });
                }

                // Link user to tenant if not done
                if (!dbUser.tenantId) {
                    await prisma.user.update({
                        where: { id: dbUser.id },
                        data: { tenantId: tenant.id },
                    });
                }

                return true;
            } catch (err) {
                console.error("[NextAuth] signIn callback error:", err);
                return false;
            }
        },

        // Enrich the JWT token with our IDs on first sign-in
        async jwt({ token, user, account }: any) {
            if (user) {
                // First login — look up IDs from DB
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { email: token.email! },
                        include: { tenant: true },
                    });
                    if (dbUser) {
                        token.userId = dbUser.id;
                        token.tenantId = dbUser.tenantId;
                    }
                } catch (err) {
                    console.error("[NextAuth] jwt callback error:", err);
                }
            }
            return token;
        },

        // Expose IDs on the client-side session object
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.userId;
                session.user.tenantId = token.tenantId;
            }
            return session;
        },
    },
    pages: {
        signIn: '/auth/signin',
    },
    debug: process.env.NODE_ENV === 'development' || true, // Enable temporarily for debugging
    cookies: {
        callbackUrl: {
            name: `next-auth.callback-url`,
            options: {
                sameSite: 'lax',
                path: '/',
                secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false
            }
        },
        csrfToken: {
            name: `next-auth.csrf-token`,
            options: {
                sameSite: 'lax',
                path: '/',
                secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false
            }
        },
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false
            }
        },
        state: {
            name: `next-auth.state`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false
            }
        },
        pkceCodeVerifier: {
            name: `next-auth.pkce.code_verifier`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false
            }
        }
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
