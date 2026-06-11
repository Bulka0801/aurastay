import { describe, expect, it } from "vitest"

import {
  canCancelReservation,
  canEditReservation,
  canTransitionHk,
  canTransitionReservation,
  canTransitionRoom,
  isRoomReadyForCheckIn,
  isTerminalReservation,
  roomStatusAfterCheckIn,
  roomStatusAfterCheckOut,
  shouldAutoCreateInspection,
} from "@/lib/rules/transitions"

describe("AuraStay status transition rules", () => {
  describe("reservation transitions", () => {
    it("allows pending reservation to become confirmed", () => {
      expect(canTransitionReservation("pending", "confirmed")).toBe(true)
    })

    it("allows confirmed reservation to become checked in", () => {
      expect(canTransitionReservation("confirmed", "checked_in")).toBe(true)
    })

    it("allows checked in reservation to become checked out", () => {
      expect(canTransitionReservation("checked_in", "checked_out")).toBe(true)
    })

    it("blocks checked out reservation from becoming checked in again", () => {
      expect(canTransitionReservation("checked_out", "checked_in")).toBe(false)
    })

    it("detects terminal reservation statuses", () => {
      expect(isTerminalReservation("checked_out")).toBe(true)
      expect(isTerminalReservation("cancelled")).toBe(true)
      expect(isTerminalReservation("no_show")).toBe(true)
    })

    it("allows editing only pending or confirmed reservations", () => {
      expect(canEditReservation("pending")).toBe(true)
      expect(canEditReservation("confirmed")).toBe(true)
      expect(canEditReservation("checked_in")).toBe(false)
      expect(canEditReservation("checked_out")).toBe(false)
    })

    it("allows cancellation only before check-in", () => {
      expect(canCancelReservation("pending")).toBe(true)
      expect(canCancelReservation("confirmed")).toBe(true)
      expect(canCancelReservation("checked_in")).toBe(false)
    })
  })

  describe("room transitions", () => {
    it("sets room status to occupied after check-in", () => {
      expect(roomStatusAfterCheckIn()).toBe("occupied")
    })

    it("sets room status to dirty after check-out", () => {
      expect(roomStatusAfterCheckOut()).toBe("dirty")
    })

    it("allows available room to become occupied", () => {
      expect(canTransitionRoom("available", "occupied")).toBe(true)
    })

    it("allows occupied room to become dirty after check-out", () => {
      expect(canTransitionRoom("occupied", "dirty")).toBe(true)
    })

    it("allows cleaning room to become available after inspection", () => {
      expect(canTransitionRoom("cleaning", "available")).toBe(true)
    })

    it("blocks dirty room from becoming occupied directly", () => {
      expect(canTransitionRoom("dirty", "occupied")).toBe(false)
    })

    it("allows check-in only for available or inspected rooms", () => {
      expect(isRoomReadyForCheckIn("available")).toBe(true)
      expect(isRoomReadyForCheckIn("inspected")).toBe(true)
      expect(isRoomReadyForCheckIn("dirty")).toBe(false)
      expect(isRoomReadyForCheckIn("maintenance")).toBe(false)
    })
  })

  describe("housekeeping task transitions", () => {
    it("allows pending task to become assigned", () => {
      expect(canTransitionHk("pending", "assigned")).toBe(true)
    })

    it("allows assigned task to move to in progress", () => {
      expect(canTransitionHk("assigned", "in_progress")).toBe(true)
    })

    it("allows in progress task to become completed", () => {
      expect(canTransitionHk("in_progress", "completed")).toBe(true)
    })

    it("allows completed task to become inspected", () => {
      expect(canTransitionHk("completed", "inspected")).toBe(true)
    })

    it("blocks inspected task from moving back to in progress", () => {
      expect(canTransitionHk("inspected", "in_progress")).toBe(false)
    })
  })

  describe("housekeeping automation helpers", () => {
    it("auto-creates inspection for turnover cleaning tasks", () => {
      expect(shouldAutoCreateInspection("standard_cleaning")).toBe(true)
      expect(shouldAutoCreateInspection("checkout_cleaning")).toBe(true)
      expect(shouldAutoCreateInspection("turndown")).toBe(true)
    })

    it("does not auto-create inspection for non-cleaning tasks", () => {
      expect(shouldAutoCreateInspection("inspection")).toBe(false)
      expect(shouldAutoCreateInspection("linen_change")).toBe(false)
      expect(shouldAutoCreateInspection("minibar_restock")).toBe(false)
    })
  })
})
