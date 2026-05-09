export const focusColor = (focus: string): string => {
  if (focus.includes("Speed & Agility")) return "text-amber-500";
  if (focus.includes("Total Skills")) return "text-emerald-500";
  if (focus.includes("Strength + Power")) return "text-rose-500";
  if (focus.includes("Shooting")) return "text-blue-500";
  if (focus.includes("Mobility")) return "text-purple-500";
  if (focus.includes("Ball Handling")) return "text-cyan-500";
  if (focus.includes("Select Practice")) return "text-orange-500";
  if (focus.includes("Game prep")) return "text-indigo-400";
  return "text-orange-500";
};

export const focusDotColor = (focus: string): string => {
  if (focus.includes("Speed & Agility")) return "bg-amber-500";
  if (focus.includes("Total Skills")) return "bg-emerald-500";
  if (focus.includes("Strength + Power")) return "bg-rose-500";
  if (focus.includes("Shooting")) return "bg-blue-500";
  if (focus.includes("Mobility")) return "bg-purple-500";
  if (focus.includes("Ball Handling")) return "bg-cyan-500";
  if (focus.includes("Select Practice")) return "bg-orange-500";
  if (focus.includes("Game prep")) return "bg-indigo-400";
  return "bg-orange-500";
};
