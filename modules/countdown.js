// modules/countdown.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

// Lưu trữ các countdown đang chạy
const activeCountdowns = new Map();

module.exports = {
  name: "countdown",
  aliases: ["clock", "demnguoc", "cd"],
  description: "Tạo đồng hồ đếm ngược đến một thời điểm cụ thể",
  usage: "!clock <ngày/tháng/năm giờ:phút> <tên sự kiện>",
  cooldown: 5000,

  async execute(message, args, client) {
    if (args.length < 2) {
      const embed = new EmbedBuilder()
        .setTitle("⏰ HƯỚNG DẪN SỬ DỤNG !CLOCK")
        .setColor(0xff0000)
        .setDescription(`
**Cú pháp:** \`!clock <thời gian> <tên sự kiện>\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**📝 Ví dụ:**
• \`!clock 16/05/2026 20:00 Giải đấu Pubg\`
• \`!clock 30/04/2026 00:00 Kỷ niệm 30/4\`

**📅 Định dạng thời gian:**
\`ngày/tháng/năm giờ:phút\`
• Ngày/Tháng/Năm: \`16/05/2026\`
• Giờ:Phút: \`20:00\` (24h)
      `);
      
      return message.reply({ embeds: [embed] });
    }

    // Lấy thời gian từ args
    const timeStr = args[0];
    const hourMin = args[1];
    const eventName = args.slice(2).join(" ");
    
    if (!eventName) {
      return message.reply({
        content: "❌ Vui lòng nhập tên sự kiện!\nVí dụ: `!clock 16/05/2026 20:00 Giải đấu Pubg`"
      });
    }

    // Parse thời gian
    const dateParts = timeStr.split('/');
    const timeParts = hourMin.split(':');
    
    if (dateParts.length !== 3 || timeParts.length !== 2) {
      return message.reply({
        content: "❌ Sai định dạng! Vui lòng dùng: `!clock 16/05/2026 20:00 Tên sự kiện`"
      });
    }

    const day = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const year = parseInt(dateParts[2]);
    const hour = parseInt(timeParts[0]);
    const minute = parseInt(timeParts[1]);

    if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(minute)) {
      return message.reply({
        content: "❌ Thời gian không hợp lệ! Vui lòng nhập số.\nVí dụ: `16/05/2026 20:00`"
      });
    }

    const targetDate = new Date(year, month, day, hour, minute, 0);
    const now = new Date();

    if (targetDate <= now) {
      return message.reply({
        content: "❌ Thời gian đã qua! Vui lòng chọn thời gian trong tương lai."
      });
    }

    const countdownId = `${message.guild.id}_${Date.now()}_${message.author.id}`;
    
    // Tạo embed ban đầu
    const embed = createCountdownEmbed(targetDate, eventName, message.author.id, null, countdownId);
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`stop_${countdownId}`)
          .setLabel("⏹️ DỪNG ĐẾM NGƯỢC")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("⏹️")
      );

    // Gửi tin nhắn countdown
    const countdownMsg = await message.channel.send({
      content: `📢 **ĐẾM NGƯỢC SỰ KIỆN** ${getEmoji("bell")}`,
      embeds: [embed],
      components: [row]
    });

    // Lưu thông tin countdown
    activeCountdowns.set(countdownId, {
      targetDate,
      eventName,
      authorId: message.author.id,
      channelId: message.channel.id,
      messageId: countdownMsg.id,
      guildId: message.guild.id,
      interval: null
    });

    // Bắt đầu đếm ngược
    startCountdown(client, countdownId);

    await message.reply({
      content: `✅ Đã tạo đồng hồ đếm ngược cho sự kiện: **${eventName}**\n📅 Thời gian: ${targetDate.toLocaleString('vi-VN')}`,
      flags: 64
    });

    console.log(`✅ ${message.author.tag} đã tạo countdown cho "${eventName}" tại ${message.guild.name}`);
  },

  async handleInteraction(interaction, client) {
    if (!interaction.isButton()) return;
    
    const customId = interaction.customId;
    
    if (customId.startsWith("stop_")) {
      const countdownId = customId.replace("stop_", "");
      const countdown = activeCountdowns.get(countdownId);
      
      if (!countdown) {
        return interaction.reply({
          content: "❌ Đồng hồ đếm ngược không còn tồn tại!",
          flags: 64
        });
      }
      
      // Kiểm tra quyền
      const isAuthor = interaction.user.id === countdown.authorId;
      const isAdmin = interaction.member.permissions.has("Administrator");
      
      if (!isAuthor && !isAdmin) {
        return interaction.reply({
          content: "❌ Bạn không có quyền dừng đồng hồ này! Chỉ người tạo hoặc Admin mới được dừng.",
          flags: 64
        });
      }
      
      await interaction.deferReply({ flags: 64 });
      
      // Dừng interval
      if (countdown.interval) {
        clearInterval(countdown.interval);
      }
      
      // Cập nhật tin nhắn thành đã dừng
      try {
        const channel = await client.channels.fetch(countdown.channelId);
        const msg = await channel.messages.fetch(countdown.messageId);
        
        const embed = new EmbedBuilder()
          .setTitle(`⏹️ ĐÃ DỪNG ĐẾM NGƯỢC: ${countdown.eventName}`)
          .setColor(0xff0000)
          .setDescription(`
**Đã dừng bởi:** ${interaction.user.toString()}
**Sự kiện:** ${countdown.eventName}
**Thời gian dừng:** <t:${Math.floor(Date.now() / 1000)}:F>
          `);
        
        await msg.edit({ embeds: [embed], components: [] });
      } catch (e) {}
      
      activeCountdowns.delete(countdownId);
      
      await interaction.editReply({
        content: `✅ Đã dừng đồng hồ đếm ngược cho sự kiện: **${countdown.eventName}**`
      });
    }
  }
};

// Hàm định dạng thời gian
function formatTimeLeft(milliseconds) {
  if (milliseconds <= 0) {
    return null;
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return { days, hours, minutes, seconds: secs };
}

// Hàm tạo embed countdown
function createCountdownEmbed(targetDate, eventName, authorId, timeLeft, countdownId) {
  let timeDisplay = "";
  let progressBar = "";
  
  if (timeLeft) {
    const { days, hours, minutes, seconds } = timeLeft;
    
    // Tạo thanh tiến trình
    const now = new Date();
    const total = targetDate.getTime() - now.getTime();
    const maxTotal = targetDate.getTime() - new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000).getTime(); // 7 ngày
    let progress = 100 - (total / maxTotal) * 100;
    progress = Math.max(0, Math.min(100, progress));
    
    const progressBarLength = 20;
    const filledLength = Math.floor((progress / 100) * progressBarLength);
    const emptyLength = progressBarLength - filledLength;
    progressBar = "█".repeat(filledLength) + "░".repeat(emptyLength);
    
    timeDisplay = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`
${progressBar} ${progress.toFixed(1)}%
\`\`\`

╔════════════════════════════════════════════╗
║  ${days.toString().padStart(3, ' ')} ngày  ⏰ ${hours.toString().padStart(2, ' ')} giờ  ⏱️ ${minutes.toString().padStart(2, ' ')} phút  ⏲️ ${seconds.toString().padStart(2, ' ')} giây  ║
╚════════════════════════════════════════════╝
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
  } else {
    timeDisplay = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ **Đang khởi tạo...**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
  }
  
  const embed = new EmbedBuilder()
    .setTitle(`⏰ ĐẾM NGƯỢC: ${eventName}`)
    .setColor(0x00ff00)
    .setDescription(`
**🕐 Thời điểm:** ${targetDate.toLocaleString('vi-VN')}
**📝 Sự kiện:** ${eventName}
**👤 Tạo bởi:** <@${authorId}>
${timeDisplay}
${getEmoji("bell")} Đồng hồ tự động cập nhật!
    `)
    .setFooter({ text: `ID: ${countdownId}` })
    .setTimestamp();

  return embed;
}

// Hàm tạo embed khi kết thúc
function createEndEmbed(eventName, authorId) {
  const embed = new EmbedBuilder()
    .setTitle(`🎉 SỰ KIỆN ĐÃ BẮT ĐẦU: ${eventName} 🎉`)
    .setColor(0xffaa00)
    .setDescription(`
${getEmoji("tada")} **THỜI ĐIỂM ĐÃ ĐẾN!** ${getEmoji("tada")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**${eventName}** đã bắt đầu!

Chúc mừng <@${authorId}> và mọi người có những giây phút vui vẻ! 🎊

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("bell")} Sự kiện đã được bắt đầu!
    `)
    .setFooter({ text: "Chúc bạn có khoảng thời gian tuyệt vời!" })
    .setTimestamp();

  return embed;
}

// Hàm khởi động đếm ngược (EDIT tin nhắn mỗi giây)
function startCountdown(client, countdownId) {
  const interval = setInterval(async () => {
    const countdown = activeCountdowns.get(countdownId);
    
    if (!countdown) {
      clearInterval(interval);
      return;
    }
    
    const now = new Date();
    const diff = countdown.targetDate - now;
    
    if (diff <= 0) {
      // Kết thúc countdown
      clearInterval(interval);
      
      try {
        const channel = await client.channels.fetch(countdown.channelId);
        const msg = await channel.messages.fetch(countdown.messageId);
        
        const endEmbed = createEndEmbed(countdown.eventName, countdown.authorId);
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`stop_${countdownId}`)
              .setLabel("🗑️ XÓA")
              .setStyle(ButtonStyle.Danger)
              .setEmoji("🗑️")
          );
        
        await msg.edit({
          content: `🎉 **${countdown.eventName.toUpperCase()} ĐÃ BẮT ĐẦU!** 🎉`,
          embeds: [endEmbed],
          components: [row]
        });
      } catch (e) {}
      
      activeCountdowns.delete(countdownId);
      return;
    }
    
    const timeLeft = formatTimeLeft(diff);
    if (!timeLeft) return;
    
    // Cập nhật embed mới
    const embed = createCountdownEmbed(
      countdown.targetDate, 
      countdown.eventName, 
      countdown.authorId, 
      timeLeft,
      countdownId
    );
    
    try {
      const channel = await client.channels.fetch(countdown.channelId);
      const msg = await channel.messages.fetch(countdown.messageId);
      
      await msg.edit({ embeds: [embed] });
    } catch (error) {
      console.error("Lỗi khi cập nhật countdown:", error.message);
      // Nếu không tìm thấy tin nhắn (bị xóa), dừng countdown
      if (error.code === 10008) {
        clearInterval(interval);
        activeCountdowns.delete(countdownId);
      }
    }
  }, 1000);
  
  // Lưu interval vào countdown
  const countdown = activeCountdowns.get(countdownId);
  if (countdown) {
    countdown.interval = interval;
    activeCountdowns.set(countdownId, countdown);
  }
}

// Hàm hỗ trợ lấy emoji
function getEmoji(name) {
  const emojis = {
    calendar: "📅",
    clock: "⏰",
    bell: "🔔",
    tada: "🎉",
    warning: "⚠️"
  };
  return emojis[name] || "•";
}