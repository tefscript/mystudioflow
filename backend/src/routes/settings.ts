import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const settingsSchema = z.object({
  notify_new: z.boolean().optional(),
  notify_cancel: z.boolean().optional(),
  notify_confirm: z.boolean().optional(),
  notify_daily_email: z.boolean().optional(),
  notify_weekly: z.boolean().optional(),
  wa_confirm_24h: z.boolean().optional(),
  wa_reminder_2h: z.boolean().optional(),
  wa_thanks: z.boolean().optional(),
  pref_dark_auto: z.boolean().optional(),
  pref_show_values: z.boolean().optional(),
  pref_block_lunch: z.boolean().optional(),
  pref_allow_sunday: z.boolean().optional(),
  evolution_url: z.string().nullable().optional(),
  evolution_key: z.string().nullable().optional(),
  evolution_instance: z.string().nullable().optional(),
  wa_msg_confirmation: z.string().nullable().optional(),
  wa_msg_reminder: z.string().nullable().optional(),
  wa_msg_reschedule: z.string().nullable().optional(),
});

async function getOrCreateSettings(userId: string) {
  let settings = await prisma.settings.findUnique({ where: { userId } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { userId } });
  }
  return settings;
}

function formatSettings(s: any) {
  return {
    notify_new: s.notifyNew,
    notify_cancel: s.notifyCancel,
    notify_confirm: s.notifyConfirm,
    notify_daily_email: s.notifyDailyEmail,
    notify_weekly: s.notifyWeekly,
    wa_confirm_24h: s.waConfirm24h,
    wa_reminder_2h: s.waReminder2h,
    wa_thanks: s.waThanks,
    pref_dark_auto: s.prefDarkAuto,
    pref_show_values: s.prefShowValues,
    pref_block_lunch: s.prefBlockLunch,
    pref_allow_sunday: s.prefAllowSunday,
    evolution_url: s.evolutionUrl ?? null,
    evolution_key: s.evolutionKey ?? null,
    evolution_instance: s.evolutionInstance ?? null,
    wa_msg_confirmation: s.waMsgConfirmation ?? null,
    wa_msg_reminder: s.waMsgReminder ?? null,
    wa_msg_reschedule: s.waMsgReschedule ?? null,
  };
}

router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const settings = await getOrCreateSettings(req.userId!);
  res.json(formatSettings(settings));
});

router.put("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = settingsSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const d = parse.data;
  const settings = await prisma.settings.upsert({
    where: { userId: req.userId },
    create: { userId: req.userId!, ...mapToPrismaFields(d) },
    update: mapToPrismaFields(d),
  });

  res.json(formatSettings(settings));
});

function mapToPrismaFields(d: z.infer<typeof settingsSchema>) {
  return {
    ...(d.notify_new !== undefined ? { notifyNew: d.notify_new } : {}),
    ...(d.notify_cancel !== undefined ? { notifyCancel: d.notify_cancel } : {}),
    ...(d.notify_confirm !== undefined ? { notifyConfirm: d.notify_confirm } : {}),
    ...(d.notify_daily_email !== undefined ? { notifyDailyEmail: d.notify_daily_email } : {}),
    ...(d.notify_weekly !== undefined ? { notifyWeekly: d.notify_weekly } : {}),
    ...(d.wa_confirm_24h !== undefined ? { waConfirm24h: d.wa_confirm_24h } : {}),
    ...(d.wa_reminder_2h !== undefined ? { waReminder2h: d.wa_reminder_2h } : {}),
    ...(d.wa_thanks !== undefined ? { waThanks: d.wa_thanks } : {}),
    ...(d.pref_dark_auto !== undefined ? { prefDarkAuto: d.pref_dark_auto } : {}),
    ...(d.pref_show_values !== undefined ? { prefShowValues: d.pref_show_values } : {}),
    ...(d.pref_block_lunch !== undefined ? { prefBlockLunch: d.pref_block_lunch } : {}),
    ...(d.pref_allow_sunday !== undefined ? { prefAllowSunday: d.pref_allow_sunday } : {}),
    ...(d.evolution_url !== undefined ? { evolutionUrl: d.evolution_url } : {}),
    ...(d.evolution_key !== undefined ? { evolutionKey: d.evolution_key } : {}),
    ...(d.evolution_instance !== undefined ? { evolutionInstance: d.evolution_instance } : {}),
    ...(d.wa_msg_confirmation !== undefined ? { waMsgConfirmation: d.wa_msg_confirmation } : {}),
    ...(d.wa_msg_reminder !== undefined ? { waMsgReminder: d.wa_msg_reminder } : {}),
    ...(d.wa_msg_reschedule !== undefined ? { waMsgReschedule: d.wa_msg_reschedule } : {}),
  };
}

export default router;
