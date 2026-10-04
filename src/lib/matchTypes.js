export const RUBBER_LABELS = {
  mens_singles: "Men's singles",
  womens_singles: "Women's singles",
  mens_doubles: "Men's doubles",
  womens_doubles: "Women's doubles",
  mixed_doubles: 'Mixed doubles',
  mixed_45_doubles: 'Mixed 40+ doubles',
};

export function rubberLabel(value) {
  return RUBBER_LABELS[value] ?? value;
}
