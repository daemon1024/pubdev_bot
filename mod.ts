import {
  TelegramBot,
  UpdateType,
  BotCommand,
} from "https://deno.land/x/telegram_bot_api/mod.ts";

const bot = new TelegramBot(Deno.env.get("BOT_TOKEN") as string);

bot.run({
  polling: true,
});

bot.on(UpdateType.Message, async ({ message }: any) => {
  try {
    const chatId = message.chat.id;
    console.log(message.text);
    const args = message?.text?.split(" ");
    if (args && args[0] == "/pub") {
      const response = await fetch(
        `https://pub.dev/api/search?q=${args.shift() ? args : ""}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      let data = await response.json();
      if (data.packages.length == 0) {
        await bot.sendMessage({
          chat_id: chatId,
          text: "No packages available for your search query",
          reply_to_message_id: message.message_id,
        });
      } else {
        let ikb = data.packages.slice(0, 5).map((pkg: any) => {
          return [{
            text: pkg.package,
            callback_data: pkg.package + " " + args.join(" "),
          }];
        });
        await bot.sendMessage({
          chat_id: chatId,
          text: "Available packages for your search query : ",
          reply_markup: {
            inline_keyboard: ikb,
          },
          reply_to_message_id: message.message_id,
        });
      }
    }
  } catch (error) {
    console.log(error);
  }
});

bot.on(UpdateType.CallbackQuery, async ({ callback_query }: any) => {
  const { id, from, data, message } = callback_query;
  try {
    // console.log(callback_query);
    if (from.id == message.reply_to_message.from.id) {
      await bot.answerCallbackQuery({
        callback_query_id: id,
      });
      let query = data?.split(" ");
      if (query[0] != "back") {
        const response = await fetch(
          `https://pub.dev/api/packages/${query[0]}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        let pkg = await response.json();
        query.shift();
        let text = "*Package* : `" + pkg.name + "`\n*Latest Version :* `" +
          pkg.latest.version +
          "`\n\n*Description : * `" + pkg.latest.pubspec.description +
          "` \n\n*Pubspec : * `" + pkg.latest.pubspec.name + "\: \^" +
          pkg.latest.pubspec.version + "`";
        await bot.editMessageText({
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: text,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Github", url: pkg.latest.pubspec.homepage },
                {
                  text: "Pub.dev",
                  url: `https://pub.dev/packages/${pkg.name}`,
                },
              ],
              [{ text: "Back", callback_data: "back " + query.join(" ") }],
            ],
          },
        });
      } else {
        query.shift();
        const response = await fetch(
          `https://pub.dev/api/search?q=${query.join(" ")}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        let data = await response.json();
        let ikb = data.packages.slice(0, 5).map((pkg: any) => {
          return [{
            text: pkg.package,
            callback_data: pkg.package + " " + query.join(" "),
          }];
        });
        await bot.editMessageText({
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: "Available packages for your search query : ",
          reply_markup: {
            inline_keyboard: ikb,
          },
        });
      }
    } else {
      await bot.answerCallbackQuery({
        callback_query_id: id,
        text: "Only request initiator can interact.",
        // show_alert:true
      });
    }
  } catch (error) {
    console.log(error);
  }
});

bot.on(
  UpdateType.Error,
  ({ error }: any) => console.error("Glitch in the Matrix", error.stack),
);
