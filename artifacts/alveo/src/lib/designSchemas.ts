import { z } from "zod";

const userInfoSchema = z.object({
  userType: z.enum(["homeowner", "renter", "designer", "browsing"]),
  stylePreference: z.enum(["minimal", "glam", "rustic", "modern", "luxury"]),
  woodFinish: z.enum(["light", "medium", "dark", "white"]),
  drawerPreference: z.enum(["many-small", "few-large", "mixed"]),
  priorityItems: z.array(z.enum(["shoes", "hanging", "folded", "accessories"])).min(1),
  hardwareFinish: z.string().optional(),
  accentColor: z.string().optional(),
});

const dimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  depth: z.number().positive(),
});

const roomDimensionsSchema = z
  .object({
    roomWidth: z.number().positive(),
    roomDepth: z.number().positive(),
  })
  .optional();

const wardrobeSchema = z.object({
  longDresses: z.number().min(0),
  shortJackets: z.number().min(0),
  suits: z.number().min(0),
  shirts: z.number().min(0),
  pants: z.number().min(0),
  tShirts: z.number().min(0),
  sweaters: z.number().min(0),
  jeans: z.number().min(0),
  underwear: z.number().min(0),
  bags: z.number().min(0),
  belts: z.number().min(0),
  jewelry: z.boolean(),
  ties: z.number().min(0),
});

const shoeSchema = z.object({
  sneakers: z.number().min(0),
  heels: z.number().min(0),
  boots: z.number().min(0),
  flats: z.number().min(0),
});

export const savedDesignSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  savedAt: z.string().min(1),
  config: z.object({
    closetType: z
      .enum([
        "reach-in",
        "walkin-single",
        "walkin-l",
        "walkin-u",
        "island",
        "corridor",
        "wardrobe-wall",
      ])
      .optional(),
    userInfo: userInfoSchema.optional(),
    dimensions: dimensionsSchema.optional(),
    roomDimensions: roomDimensionsSchema,
    wardrobe: wardrobeSchema.optional(),
    shoes: shoeSchema.optional(),
  }),
});

export const postDesignBodySchema = z.object({
  design: savedDesignSchema,
});

export const deleteDesignBodySchema = z.object({
  id: z.string().min(1).max(200),
});
