"use client";

export type UtilizationSlot = {
  label: string;
  utilization: number;
};

type ScheduleProps = {
  slots: UtilizationSlot[];
};

const Schedule = ({ slots }: ScheduleProps) => (
  <section className="glass rounded-3xl p-6 text-white">
    <div className="flex items-center justify-between">
      <h2 className="font-display text-2xl text-white">
        Crew utilization outlook
      </h2>
    </div>
    <div className="mt-6 grid grid-cols-7 gap-4">
      {slots.map((slot) => (
        <div
          key={slot.label}
          className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
        >
          <span>{slot.label}</span>
          <div className="relative h-24 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full bg-brand-400"
              style={{ height: `${slot.utilization * 100}%` }}
            />
          </div>
          <span className="font-semibold text-white">
            {Math.round(slot.utilization * 100)}%
          </span>
        </div>
      ))}
    </div>
  </section>
);

export default Schedule;
