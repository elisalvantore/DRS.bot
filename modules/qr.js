// modules/qr.js
const { EmbedBuilder } = require("discord.js");
const fs = require('fs');
const path = require('path');

// Đường dẫn đến file ảnh trong thư mục images
const QR_IMAGE_PATH = path.join(__dirname, '..', 'images', 'qr-code.jpg');

module.exports = {
  name: "qr",
  aliases: ["qrcode"],
  description: "Gửi mã QR của clan",
  usage: "!qr",
  cooldown: 3000,

  async execute(message, args, client) {
    // Kiểm tra file ảnh có tồn tại không
    if (!fs.existsSync(QR_IMAGE_PATH)) {
      return message.reply({
        content: "❌ Chưa có ảnh QR! Vui lòng liên hệ Admin để thêm ảnh.",
        flags: 64
      });
    }

    try {
      const qrImage = fs.readFileSync(QR_IMAGE_PATH);
      
      const embed = new EmbedBuilder()
        .setTitle("MÃ QR CỦA CLAN")
        .setColor(0x5865f2)
        .setDescription(`
${getEmoji("qr")} **Quét mã QR bên dưới để tài trợ!**
        `)
        .setImage("attachment://qr-code.jpg")
        .setFooter({ text: `Yêu cầu bởi: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      await message.reply({
        embeds: [embed],
        files: [{ attachment: qrImage, name: "qr-code.jpg" }]
      });
      
    } catch (error) {
      console.error("Lỗi khi gửi ảnh QR:", error);
      message.reply({
        content: "❌ Có lỗi xảy ra khi gửi mã QR! Vui lòng thử lại sau.",
        flags: 64
      });
    }
  }
};

function getEmoji(name) {
  const emojis = {
    qr: "📱",
    info: "ℹ️",
    bell: "🔔"
  };
  return emojis[name] || "•";
}