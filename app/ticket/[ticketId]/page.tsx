import { Metadata } from "next";
import { fetchTrip } from "@/services/api";
import TravelForm from "@/components/TravelForm";
import { TicketInfo } from "@/lib/types";

// Define the type for params
interface Params {
  ticketId: string;
}

// Define the props type for the page
interface PageProps {
  params: Promise<Params>; // Use Promise<Params> for App Router async params
}

async function getTripData(tripId: string): Promise<TicketInfo> {
  if (tripId != "0") {
    const data = await fetchTrip(tripId);

    return {
      airportName: data.airportName,
      travelDate: data.travelDate,
      flightNumber: data.flightNumber,
      passengers: (data.passengers || []).map((p: any) => ({
        fullName: p.fullName,
        nationalId: p.nationalId,
        luggageCount: p.luggage_count,
      })),
    };
  } else {
    // برای Server Component، تاریخ را به صورت رشته برمی‌گردانیم
    // تا بتواند به Client Component منتقل شود
    return {
      airportName: "امام خمینی",
      travelDate: "1404/05/28", // رشته تاریخ
      flightNumber: "",
      passengers: [
        {
          fullName: "",
          nationalId: "",
          luggageCount: 0,
        },
      ],
    };
  }
}

// Define the page component without NextPage
export default async function TicketPage({ params }: PageProps) {
  const { ticketId } = await params; // Await params to resolve the Promise

  const initialData = await getTripData(ticketId);

  return <TravelForm initialData={initialData} />;
}
