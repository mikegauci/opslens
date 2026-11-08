import { AsyncState } from "@opslens/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/AsyncState",
  component: AsyncState,
  tags: ["autodocs"],
} satisfies Meta<typeof AsyncState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: { variant: "loading", children: "Loading the latest queue counts…" },
  decorators: [
    (Story) => (
      <div role="status">
        <Story />
      </div>
    ),
  ],
};

export const Empty: Story = {
  args: {
    variant: "empty",
    children: "No requests in this queue. Try another queue.",
  },
  decorators: [
    (Story) => (
      <div role="status">
        <Story />
      </div>
    ),
  ],
};

export const Notice: Story = {
  args: {
    variant: "notice",
    children: "Showing counts from the previous refresh.",
  },
};

export const Failure: Story = {
  args: {
    variant: "error",
    children: "Queue counts could not be loaded. Try again.",
  },
};
