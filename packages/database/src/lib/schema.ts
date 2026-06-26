import { boolean, index, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";


export const userTable = pgTable(
    "users",
    {
        id: varchar("id",{length:255}).primaryKey(),
        name: varchar("name",{length:255}).notNull(),
        email: varchar("email",{length:255}).notNull().unique(),
        profilePicture: varchar("profile_picture",{length:255}).default(""),
    },
    (table)=>({
        emailIdx: index('user_email_index').on(table.email)
    })
);

export const authTable = pgTable(
    "auth",
    {
        id: varchar("id",{length:255}).primaryKey(),
        userId: varchar("user_id",{length:255}).notNull().references(()=> userTable.id,{onDelete:'cascade'}),
        refreshTokenJTI: varchar("refresh_token_jti",{length:255}).notNull().unique(),
        accessTokenJTI: varchar("access_token_jti",{length:255}).notNull().unique(),
        createdAt: timestamp("created_at").notNull().defaultNow()
    },
    (table)=>({
        userIdIndex: index("auth_user_id_idx").on(table.userId),
        refreshTokenIndex: index("auth_refresh_token_jti_idx").on(table.refreshTokenJTI),
        accessTokenIndex: index("auth_access_token_jti_idx").on(table.accessTokenJTI),
    })
)

export const CreateUserSchema = createInsertSchema(
    userTable,
    {
        email: z.string().email({ message: "email is not valid" }),
        name: z.string().min(2),
    }
);


export const UpdateUserSchema = CreateUserSchema.partial();
export const SelectUserSchema = createSelectSchema(userTable);
export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export type User = z.infer<typeof SelectUserSchema>;

export const CreateAuthSchema = createInsertSchema(authTable);
export const UpdateAuthSchema = CreateAuthSchema.partial();
export const SelectAuthSchema = createSelectSchema(authTable);
export type CreateAuthDto = z.infer<typeof CreateAuthSchema>;
export type UpdateAuthDto = z.infer<typeof UpdateAuthSchema>;
export type Auth = z.infer<typeof SelectAuthSchema>;