"use client";

export const steps = ["ประเภทสินค้า", "ชนิดดอกไม้", "จำนวนและสี", "ก้าน", "การจัดช่อ", "ของตกแต่ง", "ตรวจสอบ"];

export function ConfiguratorStepper({ activeStep, setActiveStep }: { activeStep: number; setActiveStep: (step: number) => void }) {
  return (
    <div className="overflow-x-auto pb-2">
      <ol className="flex min-w-max gap-2">
        {steps.map((step, index) => (
          <li key={step}>
            <button
              type="button"
              onClick={() => setActiveStep(index)}
              className={`touch-target rounded-full px-4 py-2 text-sm font-semibold transition ${index === activeStep ? "bg-blossom text-white" : index < activeStep ? "bg-stem text-white" : "bg-white text-zinc-600"}`}
            >
              {index + 1}. {step}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
