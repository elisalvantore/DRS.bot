// modules/stealemo.js
module.exports = {
  name: "stealemo",
  aliases: ["cuopemo"],
  description: "Steal emoji từ server khác về server của bạn",
  usage: "<emoji> [tên_mới]",
  cooldown: 3000,

  async execute(message, args, client) {
    // Kiểm tra quyền của user
    if (!message.member.permissions.has("ManageEmojisAndStickers")) {
      return message.reply({
        content: "❌ Bạn cần quyền **Quản lý Emoji** để sử dụng lệnh này!",
      });
    }

    // Kiểm tra bot có quyền không
    if (!message.guild.members.me.permissions.has("ManageEmojisAndStickers")) {
      return message.reply({
        content: "❌ Bot cần quyền **Quản lý Emoji** để thực hiện lệnh này!",
      });
    }

    // Lấy emoji và tên từ arguments
    const emojiArg = args[0];
    let newEmojiName = args[1];

    if (!emojiArg) {
      return message.reply({
        content: "❌ Cú pháp: `!stealemo <emoji> [tên_mới]`\nVí dụ: `!stealemo <:happy:123456789>` hoặc `!stealemo <a:dongho:987654321> ten_moi`",
      });
    }

    try {
      let emojiUrl;
      let emojiId;
      let isAnimated = false;

      // Trường hợp 1: Emoji Unicode (😀, 🎉, v.v.)
      const unicodeEmojiRegex = /[\p{Extended_Pictographic}\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/u;
      if (unicodeEmojiRegex.test(emojiArg) && !emojiArg.includes("<")) {
        return message.reply({
          content: "❌ Emoji Unicode là emoji mặc định của Discord, không cần steal! Bạn có thể dùng trực tiếp.",
        });
      }

      // Trường hợp 2: Emoji custom dạng <:name:id> hoặc <a:name:id>
      const customEmojiRegex = /<(a?):(\w+):(\d+)>/;
      const match = emojiArg.match(customEmojiRegex);

      if (match) {
        isAnimated = match[1] === "a";
        const emojiName = match[2];
        emojiId = match[3];
        
        const extension = isAnimated ? "gif" : "png";
        emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${extension}?size=128`;
        
        if (!newEmojiName) {
          newEmojiName = emojiName;
        }
      } else {
        return message.reply({
          content: "❌ Không tìm thấy emoji! Hãy dùng emoji custom từ server khác.\nVí dụ: `!stealemo <:happy:123456789> ten_moi`",
        });
      }

      // Kiểm tra tên emoji hợp lệ
      const validNameRegex = /^[\w_]{2,32}$/;
      if (!validNameRegex.test(newEmojiName)) {
        return message.reply({
          content: "❌ Tên emoji không hợp lệ! Tên phải dài 2-32 ký tự, chỉ gồm chữ cái, số và dấu gạch dưới (_).",
        });
      }

      // Kiểm tra emoji đã tồn tại
      const existingEmoji = message.guild.emojis.cache.find(
        emoji => emoji.name === newEmojiName
      );
      if (existingEmoji) {
        return message.reply({
          content: `❌ Emoji với tên \`${newEmojiName}\` đã tồn tại trong server!`,
        });
      }

      // Kiểm tra giới hạn emoji
      // const emojiCount = message.guild.emojis.cache.size;
      // const maxEmojis = message.guild.premiumTier === 0 ? 50 :
      //                   message.guild.premiumTier === 1 ? 100 :
      //                   message.guild.premiumTier === 2 ? 150 : 250;
      
      // if (emojiCount >= maxEmojis) {
      //   return message.reply({
      //     content: `❌ Server đã đạt giới hạn emoji (${emojiCount}/${maxEmojis})! Hãy xóa bớt emoji hoặc nâng cấp boost server.`,
      //   });
      // }

      // Thông báo đang xử lý
      const processingMsg = await message.reply({
        content: `⏳ Đang steal emoji \`${newEmojiName}\`...`,
      });

      // Tải emoji về
      const emoji = await message.guild.emojis.create({
        attachment: emojiUrl,
        name: newEmojiName,
        reason: `Steal bởi ${message.author.tag}`,
      });

      await processingMsg.edit({
        content: `✅ Đã steal thành công emoji ${emoji} \`${emoji.name}\`!\n🆔 ID: \`${emoji.id}\``,
      });

      console.log(`✅ ${message.author.tag} đã steal emoji ${emoji.name} (${emoji.id}) từ server ${message.guild.name}`);

    } catch (error) {
      console.error("Lỗi khi steal emoji:", error);
      
      let errorMessage = "❌ Có lỗi xảy ra khi steal emoji!";
      
      if (error.code === 30008) {
        errorMessage = "❌ Emoji này không thể steal được (có thể đến từ server khác không cho phép)!";
      } else if (error.code === 50035) {
        errorMessage = "❌ Dữ liệu emoji không hợp lệ! Hãy kiểm tra lại emoji.";
      } else if (error.message.includes("Unknown Emoji")) {
        errorMessage = "❌ Không tìm thấy emoji! Hãy đảm bảo emoji còn tồn tại.";
      } else if (error.code === 30013) {
        errorMessage = "❌ Server đã đạt giới hạn emoji tối đa!";
      }
      
      await message.reply({ content: errorMessage });
    }
  },
};