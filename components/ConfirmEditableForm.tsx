import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 🎯 اسکیم ولیدیشن
const passengerSchema = z.object({
  fullName: z.string().min(2, "نام الزامی است"),
  nationalId: z
    .string()
    .min(10, "کد ملی باید ۱۰ رقم باشد")
    .max(10)
    .regex(/^\d{10}$/, "کد ملی معتبر نیست")
    .refine((val) => isValidIranianNationalId(val), {
      message: "کد ملی نامعتبر است",
    }),
  luggageCount: z.coerce.number().min(0, "تعداد چمدان نامعتبر است"),
});

const formSchema = z.object({
  airportName: z.string().min(2, "نام فرودگاه الزامی است"),
  travelDate: z.string().min(1, "تاریخ را وارد کنید"),
  flightNumber: z.string().min(2, "شماره پرواز الزامی است"),
  passengers: z.array(passengerSchema).min(1, "حداقل یک مسافر نیاز است"),
});

type FormData = z.infer<typeof formSchema>;

// ✅ تابع تشخیص اعتبار کد ملی
function isValidIranianNationalId(nid: string) {
  if (!/^\d{10}$/.test(nid)) return false;
  const check = +nid[9];
  const sum =
    nid
      .split("")
      .slice(0, 9)
      .reduce((acc, digit, i) => acc + +digit * (10 - i), 0) % 11;

  return (sum < 2 && check === sum) || (sum >= 2 && check === 11 - sum);
}

export function ConfirmEditableForm({
  ticketInfo,
  onConfirm,
}: {
  ticketInfo: FormData;
  onConfirm: (data: FormData) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: ticketInfo,
    resolver: zodResolver(formSchema),
  });

  const { fields } = useFieldArray({
    control,
    name: "passengers",
  });

  const onSubmit = (data: FormData) => {
    onConfirm(data);
  };

  return (
    <Card className="max-w-md mx-auto mt-6 bg-white shadow-xl rounded-2xl p-4">
      <CardHeader className="text-center text-xl font-bold text-zinc-800">
        بررسی و ویرایش اطلاعات بلیط
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div>
            <Input {...register("airportName")} placeholder="مقصد" />
            {errors.airportName && (
              <p className="text-red-500 text-sm">
                {errors.airportName.message}
              </p>
            )}
          </div>

          <div>
            <Input type="date" {...register("travelDate")} />
            {errors.travelDate && (
              <p className="text-red-500 text-sm">
                {errors.travelDate.message}
              </p>
            )}
          </div>

          <div>
            <Input {...register("flightNumber")} placeholder="شماره پرواز" />
            {errors.flightNumber && (
              <p className="text-red-500 text-sm">
                {errors.flightNumber.message}
              </p>
            )}
          </div>

          <div>
            <p className="font-semibold text-right">مسافران:</p>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-2 p-3 rounded-lg border bg-zinc-100 mt-2"
              >
                <Input
                  {...register(`passengers.${index}.fullName`)}
                  placeholder={`نام مسافر ${index + 1}`}
                />
                {errors.passengers?.[index]?.fullName && (
                  <p className="text-red-500 text-sm">
                    {errors.passengers[index]?.fullName?.message}
                  </p>
                )}

                <Input
                  {...register(`passengers.${index}.nationalId`)}
                  placeholder={`کد ملی مسافر ${index + 1}`}
                />
                {errors.passengers?.[index]?.nationalId && (
                  <p className="text-red-500 text-sm">
                    {errors.passengers[index]?.nationalId?.message}
                  </p>
                )}
                <div>
                  <Input
                    type="number"
                    {...register(`passengers.${index}.luggageCount`)}
                    placeholder="تعداد چمدان"
                  />
                  {errors.passengers?.[index]?.luggageCount && (
                    <p className="text-red-500 text-sm">
                      {errors.passengers?.[index]?.luggageCount.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>

        <CardFooter className="flex justify-center mt-4">
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            type="submit"
          >
            تأیید نهایی و نمایش QRCode
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
