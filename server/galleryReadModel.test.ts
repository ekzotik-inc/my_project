import { describe, expect, it } from "vitest";
import { toApprovedGalleryPage, type GalleryAttachmentRow } from "./galleryReadModel";

function row(overrides: Partial<GalleryAttachmentRow> = {}): GalleryAttachmentRow {
  return {
    attachmentId: 10,
    assignmentStatus: "approved",
    attachmentKind: "photo",
    imageUrl: "/manus-storage/report.png",
    activityTitle: "Добрая активность",
    teamName: "Команда",
    createdAt: new Date("2026-08-26T10:00:00.000Z"),
    ...overrides,
  };
}

describe("approved gallery read model", () => {
  it("exposes only photo attachments from approved reports", () => {
    const result = toApprovedGalleryPage([
      row({ attachmentId: 4 }),
      row({ attachmentId: 3, assignmentStatus: "under_review" }),
      row({ attachmentId: 2, attachmentKind: "receipt" }),
      row({ attachmentId: 1, imageUrl: "" }),
    ], 12);
    expect(result.items.map(item => item.id)).toEqual([4]);
    expect(result.items[0]).not.toHaveProperty("participantName");
  });

  it("returns a stable cursor when one additional approved image is available", () => {
    const result = toApprovedGalleryPage([row({ attachmentId: 5 }), row({ attachmentId: 4 }), row({ attachmentId: 3 })], 2);
    expect(result.items.map(item => item.id)).toEqual([5, 4]);
    expect(result.nextCursor).toBe(4);
  });
});
