export default interface TicketInfo {
  airportName: string;
  travelDate: string;
  flightNumber: string;
  passengers: { fullName: string; nationalId: string; luggageCount: number }[];
}
