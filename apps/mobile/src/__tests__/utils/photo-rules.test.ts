import {
  canManageCheckInPhoto,
  isCheckInFromToday,
  photoCacheKey,
  toSaoPauloDate,
} from "@/utils/photo-rules";

describe("regras de data e permissão da foto", () => {
  it("usa o dia de São Paulo, não o dia UTC", () => {
    // 02:30 UTC do dia 28 ainda é 23:30 do dia 27 em São Paulo (UTC-3).
    expect(toSaoPauloDate(new Date("2026-11-28T02:30:00Z"))).toBe(
      "2026-11-27",
    );
    // 03:00 UTC já é meia-noite do dia 28 em São Paulo.
    expect(toSaoPauloDate(new Date("2026-11-28T03:00:00Z"))).toBe(
      "2026-11-28",
    );
  });

  it("considera hoje o check-in feito no mesmo dia de São Paulo", () => {
    const now = new Date("2026-11-28T02:30:00Z");
    expect(isCheckInFromToday("2026-11-27T15:00:00Z", now)).toBe(true);
    expect(isCheckInFromToday("2026-11-27T02:59:59Z", now)).toBe(false);
  });

  it("libera a foto só para o autor e só no check-in de hoje", () => {
    const now = new Date("2026-11-28T02:30:00Z");
    const checkIn = {
      user_id: "user-1",
      created_at: "2026-11-27T15:00:00Z",
    };

    expect(canManageCheckInPhoto(checkIn, "user-1", now)).toBe(true);
    expect(canManageCheckInPhoto(checkIn, "user-2", now)).toBe(false);
    expect(canManageCheckInPhoto(checkIn, undefined, now)).toBe(false);
    expect(
      canManageCheckInPhoto(
        { ...checkIn, created_at: "2026-11-26T15:00:00Z" },
        "user-1",
        now,
      ),
    ).toBe(false);
  });

  it("gera a chave de cache sem a query da URL assinada", () => {
    expect(
      photoCacheKey(
        "check-in-1",
        "https://cdn.example.com/check-ins/1/foto.jpg?token=abc",
      ),
    ).toBe("check-in-1:https://cdn.example.com/check-ins/1/foto.jpg");
  });
});
