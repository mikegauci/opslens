import type { Preview } from "@storybook/react-vite";
import "@opslens/ui/theme.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="opslens-theme" style={{ padding: 16 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: { disable: true },
    docs: { codePanel: true },
  },
};

export default preview;
