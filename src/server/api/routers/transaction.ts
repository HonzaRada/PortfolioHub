import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "~/server/api/trpc";

export const transactionRouter = createTRPCRouter({
    // 1. READ: Get all transactions for the logged-in user
    getAll: protectedProcedure.query(({ ctx }) => {
        return ctx.db.transaction.findMany({
            where: {
                userId: ctx.session.user.id, // Only show MY transactions
            },
            orderBy: {
                date: "desc",
            },
        });
    }),

    // 2. CREATE: Add a new transaction
    create: protectedProcedure
        .input(
            z.object({
                assetSymbol: z.string().min(1, "Ticker is required"),
                type: z.enum(["BUY", "SELL"]),
                quantity: z.number().positive("Quantity must be positive"),
                pricePerUnit: z.number().positive("Price must be positive"),
                date: z.date(), // We will pass a Javascript Date object
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Simulate a small delay so you can see the loading state (optional)
            // await new Promise((resolve) => setTimeout(resolve, 500));

            return ctx.db.transaction.create({
                data: {
                    userId: ctx.session.user.id, // Automatically link to the logged-in user
                    assetSymbol: input.assetSymbol.toUpperCase(),
                    type: input.type,
                    quantity: input.quantity,
                    pricePerUnit: input.pricePerUnit,
                    date: input.date,
                },
            });
        }),
});
