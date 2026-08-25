export const buildAgentBoardLinkInstruction = ({
  boardUrl,
  instruction,
}: {
  boardUrl: string;
  instruction: string;
}) => [instruction, boardUrl].join("\n");
