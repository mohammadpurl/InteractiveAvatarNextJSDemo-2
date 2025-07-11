// hooks/useReservationState.ts
import { useState } from "react";

export interface Passenger {
  fullName: string;
  nationalId: string;
  luggageCount: number;
}

export interface TicketInfo {
  airportName?: string;
  flightType?: "ورودی" | "خروجی";
  travelDate?: string;
  flightNumber?: string;
  passengers: Passenger[];
}

export function useReservationState() {
  const [ticketInfo, setTicketInfo] = useState<TicketInfo>({ passengers: [] });

  const updateInfo = (question: string, answer: string) => {
    const newInfo = { ...ticketInfo };
    const normalizedQ = question.trim();
    const normalizedA = answer.trim();

    if (/نام\s+فرودگاه/.test(normalizedQ)) {
      newInfo.airportName = normalizedA;
    } else if (/نوع\s+(پرواز|سفر)/.test(normalizedQ)) {
      if (normalizedA.includes("ورودی")) newInfo.flightType = "ورودی";
      else if (normalizedA.includes("خروجی")) newInfo.flightType = "خروجی";
    } else if (/تاریخ\s+سفر/.test(normalizedQ)) {
      newInfo.travelDate = normalizedA;
    } else if (/شماره\s+پرواز/.test(normalizedQ)) {
      newInfo.flightNumber = normalizedA;
    } else if (/نام.*مسافر/.test(normalizedQ)) {
      if (!newInfo.passengers[newInfo.passengers.length - 1]?.fullName) {
        newInfo.passengers.push({ fullName: normalizedA, nationalId: "", luggageCount: 0 });
      } else {
        newInfo.passengers[newInfo.passengers.length - 1].fullName = normalizedA;
      }
    } else if (/کد\s+ملی/.test(normalizedQ)) {
      const last = newInfo.passengers[newInfo.passengers.length - 1];
      if (last) last.nationalId = normalizedA.match(/\d{10}/)?.[0] || "";
    } else if (/تعداد\s+چمدان/.test(normalizedQ)) {
      const last = newInfo.passengers[newInfo.passengers.length - 1];
      if (last) last.luggageCount = parseInt(normalizedA.match(/\d+/)?.[0] || "0");
    }

    setTicketInfo(newInfo);
  };

  return { ticketInfo, updateInfo };
}
