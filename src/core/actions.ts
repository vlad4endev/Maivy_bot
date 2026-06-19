export type ParseMode = "HTML" | "Markdown";

export interface KeyboardButton {
  text: string;
  action?: string;
  url?: string;
}

export type Keyboard = KeyboardButton[][];

export type BotAction =
  | {
      type: "send_text";
      text: string;
      keyboard?: Keyboard;
      parseMode?: ParseMode;
    }
  | {
      type: "send_photo";
      source: string;
      caption?: string;
      keyboard?: Keyboard;
      parseMode?: ParseMode;
    }
  | {
      type: "send_video_note";
      source: string;
      keyboard?: Keyboard;
    }
  | {
      type: "send_video";
      source: string;
      caption?: string;
      keyboard?: Keyboard;
    }
  | {
      type: "edit_text";
      messageId: string;
      text: string;
      keyboard?: Keyboard;
      parseMode?: ParseMode;
    }
  | {
      type: "answer_callback";
      text?: string;
    };
