import { describe, expect, it } from "vitest";
import { buildReferralLink, canAttributeReferral, isSelfReferral, parseStartRef } from "../lib/referral";
import { appConfig } from "../lib/config";

describe("parseStartRef", () => {
  it("extracts a code from a /start command", () => expect(parseStartRef("/start ref_abc123def4")).toBe("abc123def4"));
  it("extracts a code from a bare parameter", () => expect(parseStartRef("ref_xyz")).toBe("xyz"));
  it("trims whitespace", () => expect(parseStartRef("  /start   ref_code  ")).toBe("code"));
  it("returns null for plain /start", () => expect(parseStartRef("/start")).toBeNull());
  it("returns null for non-referral payloads", () => expect(parseStartRef("/start foo")).toBeNull());
  it("returns null for empty ref code", () => expect(parseStartRef("/start ref_")).toBeNull());
  it("returns null for undefined/null/empty input", () => {
    expect(parseStartRef(undefined)).toBeNull();
    expect(parseStartRef(null)).toBeNull();
    expect(parseStartRef("")).toBeNull();
  });
});

describe("buildReferralLink", () => {
  it("builds a t.me start link for the bot", () => {
    expect(buildReferralLink("abc123def4")).toBe(`https://t.me/${appConfig.botUsername}?start=ref_abc123def4`);
  });
  it("bot username is LeadsLoveRobot", () => expect(appConfig.botUsername).toBe("LeadsLoveRobot"));
});

describe("referral guards", () => {
  it("detects self-referral", () => {
    expect(isSelfReferral("code1", "code1")).toBe(true);
    expect(isSelfReferral("code1", "code2")).toBe(false);
    expect(isSelfReferral(null, "code2")).toBe(false);
  });
  it("blocks attribution when the user already has a referrer", () => {
    const user = { referral_code: "mine", referred_by: "some-uuid" };
    expect(canAttributeReferral(user, "other")).toBe(false);
  });
  it("blocks self-referral attribution", () => {
    const user = { referral_code: "mine", referred_by: null };
    expect(canAttributeReferral(user, "mine")).toBe(false);
  });
  it("allows attribution for a fresh user with a different code", () => {
    const user = { referral_code: "mine", referred_by: null };
    expect(canAttributeReferral(user, "theirs")).toBe(true);
  });
  it("share text is the approved wording", () => {
    expect(appConfig.referralShareText).toBe("LoveLead — выполняй задания и получай выплату прямо на карту 💸");
  });
});
