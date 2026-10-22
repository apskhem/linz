import type z from "zod";
export type ZodParameterTypes = z.ZodString | z.ZodNumber | z.ZodNaN | z.ZodBigInt | z.ZodBoolean | z.ZodDate | z.ZodUndefined | z.ZodEnum<Record<string, string>> | z.ZodOptional<z.ZodType> | z.ZodPipe<z.ZodType, z.ZodTransform<any, string>> | z.ZodDefault<z.ZodType>;
export type ZodMultiMapValues<T extends z.ZodType = ZodParameterTypes> = z.ZodArray<T> | z.ZodTuple<T[]> | T;
