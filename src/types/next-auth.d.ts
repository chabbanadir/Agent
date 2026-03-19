import "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id?: string;
            tenantId?: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }

    interface User {
        id: string;
        tenantId?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        userId?: string;
        tenantId?: string;
    }
}
