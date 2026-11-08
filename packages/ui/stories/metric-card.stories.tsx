import { MetricCard } from "@opslens/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/MetricCard",
  component: MetricCard,
  tags: ["autodocs"],
  args: {
    title: "Open requests",
    value: "12",
    detail: "3 since the morning handoff",
  },
} satisfies Meta<typeof MetricCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Featured: Story = {
  args: { title: "Needs assignment", value: "4", variant: "featured" },
};
