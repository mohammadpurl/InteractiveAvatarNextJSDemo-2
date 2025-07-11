import { useState } from "react";
import { useTextChat } from "./useTextChat";



export function useBookingFlow() {
  // مراحل خرید بلیط
  const [bookingStep, setBookingStep] = useState<
    | "idle"
    | "askAirport"
    | "askFlightType"
    | "askDate"
    | "askPassengerCount"
    | "askName"
    | "askNationalId"
    | "askBaggage"
    | "askFlightNumber"
    | "confirm"
    | "waitForFinalConfirm"
    | "showQR"
  >("idle");

  const [bookingInfo, setBookingInfo] = useState({
    airport: "",
    flightType: "",
    date: "",
    passengerCount: "",
    passengers: [] as { name: string; nationalId: string; baggage: string }[],
    flightNumber: "",
  });
  const [currentPassenger, setCurrentPassenger] = useState(0);

  const { repeatMessageSync } = useTextChat();


  function extractName(text: string) {
    // فقط اولین عبارت تا اولین عدد یا نقطه را به عنوان نام بگیر
    return text.split(/[0-9.]/)[0].trim();
  }
  function extractNationalId(text: string) {
    const match = text.match(/\b\d{10}\b/);

    return match ? match[0] : "";
  }
  function extractBaggageCount(text: string) {
    const match = text.match(/\d+/);

    return match ? match[0] : "";
  }

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // تابع ارسال اطلاعات به API
  const sendBookingToApi = async (info: typeof bookingInfo) => {
    try {
      const response = await fetch("/api/book-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(info),
      });
      const data = await response.json();

      repeatMessageSync("برای پرداخت، لطفاً Q R Code زیر را اسکن کنید.");
      setQrCodeUrl(data.qrCodeUrl || "/demo-qr.png"); // اگر نبود، یک تصویر تستی
    } catch (e) {
      repeatMessageSync(
        "خطا در ارسال اطلاعات به سرور. لطفاً دوباره تلاش کنید.",
      );
    }
  };

  // مدیریت مراحل خرید بلیط
  const handleBookingFlow = (userText: string) => {
    debugger;
    switch (bookingStep) {
      case "idle":
        repeatMessageSync(
          "برای شروع خرید بلیط، لطفاً نام فرودگاه را بفرمایید.",
        );
        setBookingStep("askAirport");
        break;
      case "askAirport":
        setBookingInfo((info) => ({ ...info, airport: userText }));
        repeatMessageSync("نوع پرواز را بفرمایید (ورودی یا خروجی).");
        setBookingStep("askFlightType");
        break;
      case "askFlightType":
        setBookingInfo((info) => ({ ...info, flightType: userText }));
        repeatMessageSync("تاریخ سفر را بفرمایید.");
        setBookingStep("askDate");
        break;
      case "askDate":
        setBookingInfo((info) => ({ ...info, date: userText }));
        repeatMessageSync("تعداد مسافران را بفرمایید.");
        setBookingStep("askPassengerCount");
        break;
      case "askPassengerCount":
        if (!extractBaggageCount(userText)) {
          repeatMessageSync("تعداد مسافران را فقط به عدد وارد کنید.");
          return;
        }
        setBookingInfo((info) => ({
          ...info,
          passengerCount: extractBaggageCount(userText),
          passengers: Array(Number(extractBaggageCount(userText))).fill({
            name: "",
            nationalId: "",
            baggage: "",
          }),
        }));
        setCurrentPassenger(0);
        repeatMessageSync("نام و نام خانوادگی مسافر اول را بفرمایید.");
        setBookingStep("askName");
        break;
      case "askName":
        {
          const name = extractName(userText);

          if (!name) {
            repeatMessageSync(
              "لطفاً فقط نام و نام خانوادگی مسافر را وارد کنید.",
            );

            return;
          }
          setBookingInfo((info) => {
            const passengers = [...info.passengers];

            passengers[currentPassenger] = {
              ...passengers[currentPassenger],
              name,
            };
            return { ...info, passengers };
          });
          repeatMessageSync("کد ملی مسافر را وارد کنید.");
          setBookingStep("askNationalId");
        }
        break;
      case "askNationalId":
        {
          const nationalId = extractNationalId(userText);

          if (!nationalId) {
            repeatMessageSync(
              "کد ملی باید ۱۰ رقم باشد. لطفاً دوباره وارد کنید.",
            );

            return;
          }
          setBookingInfo((info) => {
            const passengers = [...info.passengers];

            passengers[currentPassenger] = {
              ...passengers[currentPassenger],
              nationalId,
            };

            return { ...info, passengers };
          });
          repeatMessageSync("تعداد چمدان‌های مسافر را وارد کنید.");
          setBookingStep("askBaggage");
        }
        break;
      case "askBaggage":
        {
          const baggage = extractBaggageCount(userText);

          if (!baggage) {
            repeatMessageSync("تعداد چمدان را فقط به عدد وارد کنید.");

            return;
          }
          setBookingInfo((info) => {
            const passengers = [...info.passengers];

            passengers[currentPassenger] = {
              ...passengers[currentPassenger],
              baggage,
            };
            return { ...info, passengers };
          });
          if (currentPassenger + 1 < Number(bookingInfo.passengerCount)) {
            setCurrentPassenger(currentPassenger + 1);
            repeatMessageSync(`نام و نام خانوادگی مسافر بعدی را وارد کنید.`);
            setBookingStep("askName");
          } else {
            repeatMessageSync("شماره پرواز را وارد کنید.");
            setBookingStep("askFlightNumber");
          }
        }
        break;
      case "askFlightNumber":
        setBookingInfo((info) => ({ ...info, flightNumber: userText }));
        setBookingStep("confirm");
        break;
      case "confirm":
        {
          const summary = `
لطفاً اطلاعات زیر را تأیید کنید:
فرودگاه: ${bookingInfo.airport}
نوع پرواز: ${bookingInfo.flightType}
تاریخ: ${bookingInfo.date}
شماره پرواز: ${bookingInfo.flightNumber}
تعداد مسافران: ${bookingInfo.passengerCount}
${bookingInfo.passengers.map((p, i) => `مسافر ${i + 1}: ${p.name}، کد ملی: ${p.nationalId}، چمدان: ${p.baggage}`).join("\n")}
اگر اطلاعات صحیح است، لطفاً بگویید \"تأیید\" یا \"بله\". اگر نیاز به اصلاح دارید، مرحله مورد نظر را بگویید.
          `;

          repeatMessageSync(summary);
          setBookingStep("waitForFinalConfirm");
        }
        break;
      case "waitForFinalConfirm":
        if (userText.includes("تأیید") || userText.includes("بله")) {
          sendBookingToApi(bookingInfo);
          setBookingStep("showQR");
        } else {
          repeatMessageSync(
            "کدام بخش را می‌خواهید اصلاح کنید؟ (مثلاً نام، کد ملی، چمدان و ...)",
          );
          // اینجا می‌توانی فلو اصلاح را پیاده‌سازی کنی
        }
        break;
      default:
        break;
    }
  };
  
  return {
    bookingStep,
    handleBookingFlow,
    bookingInfo,
    
  };
}
