"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type PortfolioData = {
  id: string;
  name: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialData?: PortfolioData | null; // Pokud je vyplněno, modal slouží k editaci
};

const formSchema = z.object({
  name: z.string().min(1, "Zadejte název portfolia"),
});

type FormData = z.infer<typeof formSchema>;

export function CreatePortfolioModal({ isOpen, onClose, initialData }: Props) {
  const router = useRouter();

  const utils = api.useUtils();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // reset() místo setValue() zároveň vymaže případné chybové hlášky
        reset({ name: initialData.name });
      } else {
        reset({ name: "" });
      }
    } else {
      reset({ name: "" });
    }
  }, [isOpen, initialData, reset]);

  const createPortfolio = api.portfolio.create.useMutation({
    onSuccess: () => {
      utils.portfolio.getAll.invalidate();
      router.refresh();
      onClose();
      toast.success("Portfolio vytvořeno! 🎉");
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePortfolio = api.portfolio.update.useMutation({
    onSuccess: () => {
      utils.portfolio.getAll.invalidate();
      router.refresh();
      onClose();
      toast.success("Portfolio upraveno! ✏️");
    },
    onError: (error) => toast.error(error.message),
  });

  const onSubmit = (data: FormData) => {
    if (initialData) {
      updatePortfolio.mutate({ id: initialData.id, ...data });
    } else {
      createPortfolio.mutate(data);
    }
  };

  if (!isOpen) return null;

  const isPending = createPortfolio.isPending || updatePortfolio.isPending;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-xl font-bold text-slate-900">
          {initialData ? "Upravit Portfolio" : "Nové Portfolio"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Název
            </label>
            <input
              {...register("name")}
              placeholder="Např. Dlouhodobé akcie"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              autoFocus
            />
            {errors.name && (
              <p style={{ color: "red" }} className="mt-1 ml-2 text-xs">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isPending}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50"
            >
              {isPending ? "Ukládám..." : "Uložit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
