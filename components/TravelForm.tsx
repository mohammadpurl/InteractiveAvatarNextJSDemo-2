"use client";
import DateObject from "react-date-object";

import React, { useState } from "react";
import persian_fa from "react-date-object/locales/persian_fa";
import persian from "react-date-object/calendars/persian";
import { Plus, Minus, Calendar, Plane, Users } from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { parsePersianDate } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Passenger, TicketInfo } from "@/lib/types";

type TravelFormProps = { initialData: TicketInfo };

const TravelForm: React.FC<TravelFormProps> = ({ initialData }) => {
  const { toast } = useToast();

  // تبدیل تاریخ ورودی به DateObject
  const parsedDate = initialData.travelDate && typeof initialData.travelDate === "string" 
    ? parsePersianDate(initialData.travelDate) 
    : initialData.travelDate;

  const [travelData, setTravelData] = useState<TicketInfo>({
    ...initialData,
    travelDate: parsedDate,
  });

  const handleBasicInfoChange = (
    field: keyof Pick<TicketInfo, "airportName" | "flightNumber">,
    value: string,
  ) => {
    setTravelData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDateChange = (date: any) => {
    setTravelData((prev) => ({
      ...prev,
      travelDate: date,
    }));
  };

  const handlePassengerChange = (
    index: number,
    field: keyof Passenger,
    value: string | number,
  ) => {
    setTravelData((prev) => ({
      ...prev,
      passengers: prev.passengers.map((passenger, i) =>
        i === index ? { ...passenger, [field]: value } : passenger,
      ),
    }));
  };

  const addPassenger = () => {
    setTravelData((prev) => ({
      ...prev,
      passengers: [
        ...prev.passengers,
        { fullName: "", nationalId: "", luggageCount: 1 },
      ],
    }));
  };

  const removePassenger = (index: number) => {
    if (travelData.passengers.length > 1) {
      setTravelData((prev) => ({
        ...prev,
        passengers: prev.passengers.filter((_, i) => i !== index),
      }));
    }
  };

  const handleSubmit = () => {
    const dataToSend = {
      ...travelData,
      travelDate:
        travelData.travelDate && typeof travelData.travelDate !== "string"
          ? travelData.travelDate.format("MMMM YYYY")
          : travelData.travelDate || "",
    };
    const jsonData = JSON.stringify(dataToSend, null, 2);
    navigator.clipboard.writeText(jsonData);
    toast({
      title: "اطلاعات کپی شد",
      description: "اطلاعات سفر در کلیپ‌بورد کپی شد",
    });
  };

  return (
    <div className="bg-navy-dark min-h-screen" dir="rtl">
      <div className="p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-8">
          {/* Header */}
          <Card className="border-golden-accent border border-[#f5a623]/20 bg-[#0d0c1d] shadow-lg">
            <CardHeader className="text-center p-4 sm:p-6">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                <Plane className="text-golden-accent w-6 h-6 sm:w-8 sm:h-8" />
                <span className="text-center bg-gradient-to-r from-[#51baff] to-[#2fa4ff] bg-clip-text text-transparent">
                  فرم اطلاعات سفر
                </span>
                <Plane className="text-golden-accent w-6 h-6 sm:w-8 sm:h-8" />
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Flight Information */}
          <Card className="border-golden-accent border border-[#f5a623]/20 bg-[#0d0c1d] shadow-course">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-foreground flex items-center gap-2">
                <Calendar className="text-golden-accent w-5 h-5 sm:w-6 sm:h-6" />
                اطلاعات پرواز
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="airport" className="text-foreground">
                    نام فرودگاه
                  </Label>
                  <Input
                    id="airport"
                    value={travelData.airportName}
                    onChange={(e) =>
                      handleBasicInfoChange("airportName", e.target.value)
                    }
                    className="bg-input border-golden-accent text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flightNumber" className="text-foreground">
                    شماره پرواز
                  </Label>
                  <Input
                    id="flightNumber"
                    value={travelData.flightNumber}
                    onChange={(e) =>
                      handleBasicInfoChange("flightNumber", e.target.value)
                    }
                    className="bg-input border-golden-accent text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">تاریخ سفر</Label>
                  <DatePicker
                    calendar={persian}
                    locale={persian_fa}
                    value={travelData.travelDate}
                    onChange={handleDateChange}
                    style={{
                      width: "100%",
                      height: "40px",
                      backgroundColor: "hsl(var(--input))",
                      border: "1px solid hsl(var(--golden-accent))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--foreground))",
                      padding: "0 12px",
                    }}
                    placeholder="انتخاب تاریخ"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Passengers Section */}
          <Card className="border-golden-accent border border-[#f5a623]/20 bg-[#0d0c1d] shadow-course">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Users className="text-golden-accent w-5 h-5 sm:w-6 sm:h-6" />
                  <span>مسافران</span>
                  <Badge
                    variant="secondary"
                    className="bg-golden-accent text-accent-foreground shadow-course"
                  >
                    {travelData.passengers.length} نفر
                  </Badge>
                </div>
                <Button
                  onClick={addPassenger}
                  size="sm"
                  className="bg-golden-accent text-accent-foreground hover:bg-golden-accent/90 text-sm shadow-course transition-transform duration-300 ease-out hover:scale-105 border border-blue-500 shadow-[0px_5px_20px_rgba(0,173,255,0.2)]"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  <span className="hidden sm:inline bg-gradient-to-r from-[#51baff] to-[#2fa4ff] bg-clip-text text-transparent text-lg">
                    افزودن مسافر
                  </span>
                  <span className="sm:hidden bg-gradient-to-r from-[#51baff] to-[#2fa4ff] bg-clip-text text-transparent">
                    افزودن
                  </span>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              {travelData.passengers.map((passenger, index) => (
                <Card
                  key={index}
                  className="border-muted bg-navy-surface-light bg-[#0e1222] text-white p-4 rounded-xl border border-blue-500 shadow-[0px_5px_20px_rgba(0,173,255,0.2)] hover:scale-[1.02] transition-all ease-out duration-1000 shadow-110"
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-base sm:text-lg font-semibold text-foreground">
                        مسافر {index + 1}
                      </h4>
                      {travelData.passengers.length > 1 && (
                        <Button
                          onClick={() => removePassenger(index)}
                          size="sm"
                          variant="destructive"
                          className="text-xs sm:text-sm"
                        >
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline mr-1">حذف</span>
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">
                          نام و نام خانوادگی
                        </Label>
                        <Input
                          value={passenger.fullName}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "fullName",
                              e.target.value,
                            )
                          }
                          className="bg-input border-golden-accent text-foreground"
                          placeholder="نام کامل"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground">کد ملی</Label>
                        <Input
                          value={passenger.nationalId}
                          onChange={(e) =>
                            handlePassengerChange(
                              index,
                              "nationalId",
                              e.target.value,
                            )
                          }
                          className="bg-input border-golden-accent text-foreground"
                          placeholder="کد ملی ۱۰ رقمی"
                          maxLength={10}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground text-sm">
                          تعداد بار
                        </Label>
                        <div className="flex items-center space-x-2 space-x-reverse justify-center sm:justify-start">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handlePassengerChange(
                                index,
                                "luggageCount",
                                Math.max(0, passenger.luggageCount - 1),
                              )
                            }
                            className="border-golden-accent text-foreground hover:bg-golden-accent hover:text-accent-foreground h-8 w-8 p-0 transition-transform duration-300 ease-out hover:scale-110"
                          >
                            <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <span className="text-lg sm:text-xl font-semibold text-foreground w-8 sm:w-10 text-center">
                            {passenger.luggageCount}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handlePassengerChange(
                                index,
                                "luggageCount",
                                passenger.luggageCount + 1,
                              )
                            }
                            className="border-golden-accent text-foreground hover:bg-golden-accent hover:text-accent-foreground h-8 w-8 p-0 transition-transform duration-300 ease-out hover:scale-110"
                          >
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 p-4 border-golden-accent border border-[#f5a623]/20 bg-[#0d0c1d] shadow-course">
            <Button
              onClick={handleSubmit}
              size="lg"
              className="bg-golden-accent text-accent-foreground hover:bg-golden-accent/90 text-sm shadow-course transition-transform duration-300 ease-out hover:scale-105 border border-blue-500 shadow-[0px_5px_20px_rgba(0,173,255,0.2)]"
            >
              <span className="bg-gradient-to-r from-[#51baff] to-[#2fa4ff] bg-clip-text text-transparent text-base sm:text-lg">
                تایید و پرداخت
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelForm;
