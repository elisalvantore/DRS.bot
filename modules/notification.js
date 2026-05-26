// const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
// const fs = require('fs');
// const path = require('path');
// const schedule = require('node-schedule');

// // File lưu trữ thông báo
// const NOTIFICATIONS_FILE = path.join(__dirname, '..', 'notifications.json');

// // Load notifications từ file
// let notifications = [];
// if (fs.existsSync(NOTIFICATIONS_FILE)) {
//   try {
//     notifications = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf8'));
//   } catch (e) {
//     console.error("Lỗi load notifications:", e);
//   }
// }

// // Lưu notifications
// function saveNotifications() {
//   fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
// }

// // Lưu trạng thái tạm thời cho từng user khi đang setup
// const userSetup = new Map();

// module.exports = {
//   name: "noti",
//   aliases: ["notification", "thongbao"],
//   description: "Tạo thông báo định kỳ",
//   usage: "!noti",
//   cooldown: 10000,

//   async execute(message, args, client) {
//     // Kiểm tra quyền Admin
//     if (!message.member.permissions.has("Administrator")) {
//       return message.reply({
//         content: "❌ Bạn cần quyền **Administrator** để sử dụng lệnh này!",
//         flags: 64
//       });
//     }

//     // Tạo select menu cho chế độ lặp lại
//     const selectMenu = new StringSelectMenuBuilder()
//       .setCustomId("repeat_mode_select")
//       .setPlaceholder("🔁 Chọn chế độ lặp lại")
//       .addOptions([
//         { label: "Hàng năm", value: "yearly", emoji: "📅", description: "Thông báo mỗi năm 1 lần" },
//         { label: "Hàng tháng", value: "monthly", emoji: "📆", description: "Thông báo mỗi tháng 1 lần" },
//         { label: "Hàng tuần", value: "weekly", emoji: "📊", description: "Thông báo mỗi tuần 1 lần" },
//         { label: "Hàng ngày", value: "daily", emoji: "🌞", description: "Thông báo mỗi ngày 1 lần" },
//         { label: "Hàng giờ", value: "hourly", emoji: "⏰", description: "Thông báo mỗi giờ 1 lần" },
//         { label: "Hàng phút", value: "minutely", emoji: "⏱️", description: "Thông báo mỗi phút 1 lần" }
//       ]);

//     const row = new ActionRowBuilder().addComponents(selectMenu);

//     const embed = new EmbedBuilder()
//       .setTitle("⏰ TẠO THÔNG BÁO MỚI")
//       .setColor(0x5865f2)
//       .setDescription(`
// ${getEmoji("info")} **Hãy trả lời các câu hỏi sau để tạo thông báo:**

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// **1️⃣ Thời gian bắt đầu:** \`dd/MM/yyyy - HH:mm\`
// • Ví dụ: \`25/05/2026 - 14:30\`

// **2️⃣ Chế độ lặp lại:** Chọn từ menu bên dưới

// ${getEmoji("bell")} Sau khi chọn, bot sẽ hỏi thêm nếu cần!
//       `)
//       .setFooter({ text: "Bạn có thể hủy bất cứ lúc nào bằng cách gõ 'cancel'" });

//     // Lưu trạng thái setup cho user
//     userSetup.set(message.author.id, {
//       step: "waiting_time",
//       messageId: null,
//       channelId: message.channel.id
//     });

//     const msg = await message.reply({
//       content: "⏰ **BẮT ĐẦU TẠO THÔNG BÁO** ⏰",
//       embeds: [embed],
//       components: [row]
//     });

//     // Cập nhật messageId
//     const setup = userSetup.get(message.author.id);
//     setup.messageId = msg.id;
//     userSetup.set(message.author.id, setup);

//     // Tạo collector để lắng nghe phản hồi
//     const messageFilter = (m) => m.author.id === message.author.id;
//     const collector = message.channel.createMessageCollector({ filter: messageFilter, time: 300000 });

//     collector.on('collect', async (m) => {
//       const setupData = userSetup.get(message.author.id);
//       if (!setupData) return;

//       if (m.content.toLowerCase() === 'cancel') {
//         collector.stop();
//         userSetup.delete(message.author.id);
//         await m.reply("❌ Đã hủy tạo thông báo!");
//         return;
//       }

//       if (setupData.step === "waiting_time") {
//         // Kiểm tra định dạng thời gian
//         const timeRegex = /^(\d{2})\/(\d{2})\/(\d{4}) - (\d{2}):(\d{2})$/;
//         const match = m.content.match(timeRegex);

//         if (!match) {
//           return m.reply("❌ Sai định dạng! Vui lòng nhập theo mẫu: `dd/MM/yyyy - HH:mm`\nVí dụ: `25/05/2026 - 14:30`");
//         }

//         const day = parseInt(match[1]);
//         const month = parseInt(match[2]) - 1;
//         const year = parseInt(match[3]);
//         const hour = parseInt(match[4]);
//         const minute = parseInt(match[5]);

//         const startTime = new Date(year, month, day, hour, minute, 0);
//         const now = new Date();

//         if (startTime <= now) {
//           return m.reply("❌ Thời gian phải ở tương lai! Vui lòng nhập lại.");
//         }

//         setupData.startTime = startTime;
//         setupData.step = "waiting_repeat_value";
//         userSetup.set(message.author.id, setupData);

//         await m.reply(`✅ Đã nhận thời gian: ${startTime.toLocaleString('vi-VN')}\n\n⏳ Vui lòng **chọn chế độ lặp lại** từ menu bên trên!`);
//         return;
//       }
//     });

//     // Xử lý select menu
//     const selectFilter = (interaction) => interaction.customId === "repeat_mode_select" && interaction.user.id === message.author.id;
//     const selectCollector = message.channel.createMessageComponentCollector({ filter: selectFilter, time: 300000 });

//     selectCollector.on('collect', async (interaction) => {
//       const setupData = userSetup.get(message.author.id);
//       if (!setupData) {
//         await interaction.reply({ content: "❌ Phiên làm việc đã hết hạn! Vui lòng chạy lại lệnh !noti", flags: 64 });
//         return;
//       }

//       const selectedMode = interaction.values[0];
//       setupData.repeatMode = selectedMode;
//       setupData.repeatValue = 1;

//       await interaction.reply({ content: `✅ Đã chọn: **${getModeName(selectedMode)}**`, flags: 64 });

//       if (selectedMode === "daily") {
//         setupData.step = "waiting_daily_value";
//         await interaction.followUp({ content: "📅 **Bạn muốn set bao nhiêu ngày 1 lần?** (Nhập số > 0)", flags: 64 });
//       } else if (selectedMode === "hourly") {
//         setupData.step = "waiting_hourly_value";
//         await interaction.followUp({ content: "⏰ **Bạn muốn set bao nhiêu giờ 1 lần?** (Nhập số > 0)", flags: 64 });
//       } else if (selectedMode === "minutely") {
//         setupData.step = "waiting_minutely_value";
//         await interaction.followUp({ content: "⏱️ **Bạn muốn set bao nhiêu phút 1 lần?** (Nhập số > 0)", flags: 64 });
//       } else {
//         setupData.step = "waiting_content";
//         await interaction.followUp({ content: "📝 **Nội dung của thông báo là gì?**\n(Hãy nhập nội dung bạn muốn thông báo)", flags: 64 });
//       }

//       userSetup.set(message.author.id, setupData);
//     });
//   },

//   // Xử lý các bước tiếp theo từ message collector
//   async handleMessage(message, client) {
//     const setupData = userSetup.get(message.author.id);
//     if (!setupData) return;

//     if (setupData.step === "waiting_daily_value") {
//       const value = parseInt(message.content);
//       if (isNaN(value) || value <= 0) {
//         return message.reply("❌ Vui lòng nhập số > 0!");
//       }
//       setupData.repeatValue = value;
//       setupData.step = "waiting_content";
//       userSetup.set(message.author.id, setupData);
//       await message.reply("✅ Đã nhận số ngày!\n\n📝 **Nội dung của thông báo là gì?**");
//       return;
//     }

//     if (setupData.step === "waiting_hourly_value") {
//       const value = parseInt(message.content);
//       if (isNaN(value) || value <= 0) {
//         return message.reply("❌ Vui lòng nhập số > 0!");
//       }
//       setupData.repeatValue = value;
//       setupData.step = "waiting_content";
//       userSetup.set(message.author.id, setupData);
//       await message.reply("✅ Đã nhận số giờ!\n\n📝 **Nội dung của thông báo là gì?**");
//       return;
//     }

//     if (setupData.step === "waiting_minutely_value") {
//       const value = parseInt(message.content);
//       if (isNaN(value) || value <= 0) {
//         return message.reply("❌ Vui lòng nhập số > 0!");
//       }
//       setupData.repeatValue = value;
//       setupData.step = "waiting_channel";
//       userSetup.set(message.author.id, setupData);
//       await message.reply("✅ Đã nhận số phút!\n\n📢 **Bạn muốn thông báo vào kênh nào?**\n(Hãy tag kênh hoặc gửi link kênh)");
//       return;
//     }

//     if (setupData.step === "waiting_content") {
//       setupData.content = message.content;
//       setupData.step = "waiting_channel";
//       userSetup.set(message.author.id, setupData);
//       await message.reply("✅ Đã nhận nội dung!\n\n📢 **Bạn muốn thông báo vào kênh nào?**\n(Hãy tag kênh hoặc gửi link kênh)");
//       return;
//     }

//     if (setupData.step === "waiting_channel") {
//         // Lấy channel ID từ mention hoặc link
//         let channelId = null;
  
//         // Cách 1: Tag kênh dạng <#123456789>
//         const channelMention = message.content.match(/<#(\d+)>/);
  
//         // Cách 2: Link kênh
//         const channelLink = message.content.match(/discord\.com\/channels\/\d+\/(\d+)/);
  
//         // Cách 3: Tên kênh (nếu có dấu # phía trước)
//         const channelName = message.content.match(/^#(\w+)/);
  
//         // Cách 4: Lấy trực tiếp ID nếu user nhập số
//         const directId = message.content.match(/^(\d+)$/);

//         if (channelMention) {
//             channelId = channelMention[1];
//         } else if (channelLink) {
//             channelId = channelLink[1];
//         } else if (channelName) {
//             // Tìm kênh theo tên
//             const foundChannel = message.guild.channels.cache.find(
//                 ch => ch.name === channelName[1] && ch.type === 0 // 0 = GuildText
//             );
//             if (foundChannel) channelId = foundChannel.id;
//         } else if (directId) {
//             channelId = directId[1];
//         }
  
//         if (!channelId) {
//             return message.reply("❌ Không nhận diện được kênh! Vui lòng:\n• Tag kênh: `#ten-kênh`\n• Hoặc gửi link kênh\n• Hoặc gửi ID kênh");
//         }

//         const targetChannel = message.guild.channels.cache.get(channelId);
//         if (!targetChannel || targetChannel.type !== 0) { // 0 = GuildText
//             return message.reply("❌ Không tìm thấy kênh văn bản! Vui lòng thử lại.");
//         }

//         setupData.channelId = channelId;
  
//         // Tạo thông báo
//         const notification = {
//             id: Date.now(),
//             guildId: message.guild.id,
//             channelId: channelId,
//             startTime: setupData.startTime,
//             repeatMode: setupData.repeatMode,
//             repeatValue: setupData.repeatValue || 1,
//             content: setupData.content,
//             createdBy: message.author.id,
//             createdAt: new Date(),
//             nextRun: setupData.startTime
//         };

//         notifications.push(notification);
//         saveNotifications();

//         // Schedule job
//         scheduleNotification(client, notification);

//         await message.reply(`✅ **TẠO THÔNG BÁO THÀNH CÔNG!**\n\n📅 Thời gian: ${setupData.startTime.toLocaleString('vi-VN')}\n🔄 Lặp lại: ${getModeName(setupData.repeatMode)}${setupData.repeatValue > 1 ? ` (${setupData.repeatValue})` : ''}\n📢 Kênh: ${targetChannel.toString()}\n📝 Nội dung: ${setupData.content.substring(0, 100)}${setupData.content.length > 100 ? '...' : ''}`);

//         // Dọn dẹp
//         userSetup.delete(message.author.id);
  
//         // Xóa tin nhắn hướng dẫn cũ
//         try {
//             const setupMsg = await message.channel.messages.fetch(setupData.messageId);
//             if (setupMsg) await setupMsg.delete();
//         } catch (e) {}
//     }
//   },

//   // Liệt kê tất cả thông báo
//   async listNotifications(message) {
//     const guildNotifications = notifications.filter(n => n.guildId === message.guild.id);
    
//     if (guildNotifications.length === 0) {
//       return message.reply("📭 Chưa có thông báo nào được tạo!");
//     }

//     let description = "";
//     for (const noti of guildNotifications) {
//       const channel = message.guild.channels.cache.get(noti.channelId);
//       description += `**ID:** \`${noti.id}\`\n`;
//       description += `📅 Thời gian: ${new Date(noti.startTime).toLocaleString('vi-VN')}\n`;
//       description += `🔄 Lặp: ${getModeName(noti.repeatMode)}${noti.repeatValue > 1 ? ` x${noti.repeatValue}` : ''}\n`;
//       description += `📢 Kênh: ${channel ? channel.toString() : 'Đã xóa'}\n`;
//       description += `📝 Nội dung: ${noti.content.substring(0, 50)}${noti.content.length > 50 ? '...' : ''}\n`;
//       description += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
//     }

//     const embed = new EmbedBuilder()
//       .setTitle("📋 DANH SÁCH THÔNG BÁO")
//       .setColor(0x5865f2)
//       .setDescription(description)
//       .setFooter({ text: `Tổng cộng: ${guildNotifications.length} thông báo` });

//     await message.reply({ embeds: [embed] });
//   },

//   // Xóa thông báo
//   async deleteNotification(message, notiId) {
//     const index = notifications.findIndex(n => n.id == notiId && n.guildId === message.guild.id);
    
//     if (index === -1) {
//       return message.reply("❌ Không tìm thấy thông báo với ID này!");
//     }

//     notifications.splice(index, 1);
//     saveNotifications();
    
//     await message.reply(`✅ Đã xóa thông báo ID: \`${notiId}\``);
//   },

//   // Khởi động lại tất cả notification khi bot restart
//   init(client) {
//     for (const noti of notifications) {
//       scheduleNotification(client, noti);
//     }
//     console.log(`✅ Đã khởi động ${notifications.length} thông báo định kỳ`);
//   }
// };

// // Hàm schedule notification
// function scheduleNotification(client, notification) {
//   const now = new Date();
//   let nextRun = new Date(notification.startTime);
  
//   // Nếu thời gian đã qua, tính thời gian tiếp theo
//   while (nextRun <= now) {
//     nextRun = getNextRunTime(nextRun, notification.repeatMode, notification.repeatValue);
//   }
  
//   notification.nextRun = nextRun;
  
//   const job = schedule.scheduleJob(nextRun, async () => {
//     try {
//       const guild = client.guilds.cache.get(notification.guildId);
//       if (!guild) return;
      
//       const channel = guild.channels.cache.get(notification.channelId);
//       if (!channel) return;
      
//       // Gửi thông báo dạng text thường (không embed)
//       await channel.send(`🔔 **THÔNG BÁO ĐỊNH KỲ** 🔔\n${notification.content}`);
      
//       console.log(`✅ Đã gửi thông báo "${notification.content.substring(0, 50)}..." tại ${guild.name}`);
      
//       // Tính thời gian chạy tiếp theo
//       const nextRunTime = getNextRunTime(new Date(), notification.repeatMode, notification.repeatValue);
      
//       // Cập nhật thời gian trong file
//       const index = notifications.findIndex(n => n.id === notification.id);
//       if (index !== -1) {
//         notifications[index].nextRun = nextRunTime;
//         saveNotifications();
//       }
      
//       // Schedule lần tiếp theo
//       schedule.scheduleJob(nextRunTime, async () => {
//         // Logic gửi lại thông báo (có thể recursive)
//       });
      
//     } catch (error) {
//       console.error("Lỗi khi gửi thông báo:", error);
//     }
//   });
  
//   return job;
// }

// // Tính thời gian chạy tiếp theo
// function getNextRunTime(currentTime, mode, value) {
//   const next = new Date(currentTime);
  
//   switch (mode) {
//     case "yearly":
//       next.setFullYear(next.getFullYear() + value);
//       break;
//     case "monthly":
//       next.setMonth(next.getMonth() + value);
//       break;
//     case "weekly":
//       next.setDate(next.getDate() + (7 * value));
//       break;
//     case "daily":
//       next.setDate(next.getDate() + value);
//       break;
//     case "hourly":
//       next.setHours(next.getHours() + value);
//       break;
//     case "minutely":
//       next.setMinutes(next.getMinutes() + value);
//       break;
//   }
  
//   return next;
// }

// // Lấy tên hiển thị của mode
// function getModeName(mode) {
//   const modes = {
//     yearly: "📅 Hàng năm",
//     monthly: "📆 Hàng tháng",
//     weekly: "📊 Hàng tuần",
//     daily: "🌞 Hàng ngày",
//     hourly: "⏰ Hàng giờ",
//     minutely: "⏱️ Hàng phút"
//   };
//   return modes[mode] || mode;
// }

// function getEmoji(name) {
//   const emojis = {
//     info: "ℹ️",
//     bell: "🔔",
//     warning: "⚠️"
//   };
//   return emojis[name] || "•";
// }

// modules/noti.js

// 5 mẫu thông báo ngẫu nhiên
const notifications = [
  "🎯 **CƠ HỘI THỂ HIỆN BẢN LĨNH!**\nChào mừng các chiến binh! Giải custom sắp diễn ra, hãy đăng ký ngay để cùng nhau tranh tài! 🏆\n\n📝 Đăng ký tại đây: {link}",
  
  "⚔️ **SẴN SÀNG CHIẾN ĐẤU!**\nCác game thủ thân mến, đã đến lúc thể hiện kỹ năng của bạn! Giải custom đang chờ đón.\n\n📝 Đăng ký ngay: {link}",
  
  "🔥 **ĐỪNG BỎ LỠ CƠ HỘI!**\nGiải custom với nhiều phần thưởng hấp dẫn đang chờ bạn! Hãy nhanh tay đăng ký.\n\n📝 Link đăng ký: {link}",
  
  "🎮 **KÊU GỌI CHIẾN BINH!**\nCác thành viên thân mến, giải custom sắp bắt đầu. Hãy đăng ký ngay hôm nay!\n\n📝 Đăng ký tại đây: {link}",
  
  "🏆 **THỬ THÁCH ĐANG CHỜ!**\nBạn có đủ bản lĩnh để chinh phục giải custom? Hãy đăng ký ngay để chứng tỏ tài năng!\n\n📝 Đăng ký: {link}"
];

// Lưu interval
let notificationInterval = null;
let currentChannelLink = null;

module.exports = {
  name: "noti",
  aliases: ["notification", "thongbao"],
  description: "Bắt đầu thông báo định kỳ 3 ngày/lần",
  usage: "!noti <link_kênh_đăng_ký>",
  cooldown: 10000,

  async execute(message, args, client) {
    // Kiểm tra quyền Admin
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Bạn cần quyền **Administrator** để sử dụng lệnh này!");
    }

    // Kiểm tra link kênh
    const channelLink = args[0];
    if (!channelLink) {
      return message.reply(`❌ Cú pháp: \`!noti <link_kênh_đăng_ký>\`\n\n📝 Ví dụ: \`!noti https://discord.com/channels/123456789/987654321\``);
    }

    // Kiểm tra định dạng link
    const channelMatch = channelLink.match(/discord\.com\/channels\/(\d+)\/(\d+)/);
    if (!channelMatch) {
      return message.reply("❌ Link kênh không hợp lệ! Vui lòng copy link kênh từ Discord.\n\n🔧 Cách lấy link: Chuột phải vào kênh -> Copy Link");
    }

    const guildId = channelMatch[1];
    const channelId = channelMatch[2];

    // Kiểm tra xem có đúng server hiện tại không
    if (guildId !== message.guild.id) {
      return message.reply("❌ Link kênh không thuộc server hiện tại! Vui lòng copy link từ kênh trong server này.");
    }

    // Kiểm tra kênh có tồn tại không
    const targetChannel = message.guild.channels.cache.get(channelId);
    if (!targetChannel) {
      return message.reply("❌ Không tìm thấy kênh! Vui lòng kiểm tra lại link.");
    }

    // Kiểm tra xem đã có thông báo đang chạy chưa
    if (notificationInterval) {
      return message.reply("⚠️ Đã có thông báo đang chạy! Vui lòng dùng `!stopnoti` để dừng trước khi bắt đầu mới.");
    }

    // Lưu link kênh
    currentChannelLink = channelLink;

    // Tìm kênh để gửi thông báo (ưu tiên kênh hiện tại)
    let announceChannel = message.channel;

    // Gửi thông báo đầu tiên ngay lập tức
    await sendNotification(announceChannel, targetChannel, channelLink);

    // Thiết lập interval 3 ngày (259200000 ms)
    notificationInterval = setInterval(async () => {
      await sendNotification(announceChannel, targetChannel, channelLink);
    }, 3 * 24 * 60 * 60 * 1000); // 3 ngày

    await message.reply(`✅ **ĐÃ BẮT ĐẦU THÔNG BÁO ĐỊNH KỲ!**\n\n📅 **Tần suất:** 3 ngày / lần\n📢 **Kênh thông báo:** ${announceChannel.toString()}\n🔗 **Kênh đăng ký:** ${targetChannel.toString()}\n\n🔄 Đã gửi thông báo đầu tiên!\n⏹️ Dùng \`!stopnoti\` để dừng.`);
  },

  // Dừng thông báo
  async stop(message, args, client) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Bạn cần quyền **Administrator** để dừng thông báo!");
    }

    if (!notificationInterval) {
      return message.reply("⚠️ Không có thông báo nào đang chạy!");
    }

    clearInterval(notificationInterval);
    notificationInterval = null;
    currentChannelLink = null;

    await message.reply("✅ **ĐÃ DỪNG THÔNG BÁO ĐỊNH KỲ!**\n\nDùng `!noti <link_kênh>` để bắt đầu lại.");
  },

  // Khởi tạo lại khi bot restart
  init(client) {
    console.log("✅ Module noti đã sẵn sàng");
  }
};

// Hàm gửi thông báo
async function sendNotification(channel, registerChannel, link) {
  // Random 1 trong 5 thông báo
  const randomIndex = Math.floor(Math.random() * notifications.length);
  let notiContent = notifications[randomIndex];
  
  // Thay thế {link} bằng link thật
  notiContent = notiContent.replace("{link}", link);

  // Tạo tin nhắn với @everyone
  const message = `🔔 **THÔNG BÁO** 🔔\n@everyone\n\n${notiContent}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔥 Nhanh tay đăng ký để nhận những phần thưởng hấp dẫn!`;

  // Gửi thông báo
  await channel.send(message);
  
  console.log(`✅ Đã gửi thông báo định kỳ tại kênh ${channel.name}`);
}