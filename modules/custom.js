// modules/custom.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { getGuildConfig } = require("./configHelper");

// Lưu số kênh cho từng server
const supportChannelCount = new Map();
const sponsorChannelCount = new Map();

// Category cố định
const SUPPORT_CATEGORY_NAME = "HỖ TRỢ";
const SPONSOR_CATEGORY_NAME = "TÀI TRỢ";
const NOTIFICATION_CHANNEL_NAME = "dang-ky-custom";

module.exports = {
  name: "custom",
  aliases: ["cus"],
  description: "Tạo form đăng ký giải custom",
  usage: "!cus",
  cooldown: 5000,

  async execute(message, args, client) {
    // Kiểm tra quyền Admin
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({
        content: "❌ Bạn cần quyền **Administrator** để sử dụng lệnh này!",
        flags: 64
      });
    }

    // Lấy config cho server
    const guildConfig = getGuildConfig(message.guild.id);
    if (!guildConfig) {
      return message.reply({
        content: "❌ Server chưa được cấu hình! Vui lòng kiểm tra lại configs.json",
        flags: 64
      });
    }

    // Tạo hoặc tìm kênh thông báo
    let notificationChannel = message.guild.channels.cache.find(
      ch => ch.type === ChannelType.GuildText && ch.name === NOTIFICATION_CHANNEL_NAME
    );

    if (!notificationChannel) {
      try {
        notificationChannel = await message.guild.channels.create({
          name: NOTIFICATION_CHANNEL_NAME,
          type: ChannelType.GuildText,
          topic: "Kênh thông báo đăng ký tham gia giải custom",
          permissionOverwrites: [
            {
              id: message.guild.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            }
          ]
        });
        console.log(`✅ Đã tạo kênh ${NOTIFICATION_CHANNEL_NAME}`);
      } catch (error) {
        console.error("Lỗi khi tạo kênh thông báo:", error);
      }
    }

    // Tạo embed đẹp mắt
    const embed = new EmbedBuilder()
      .setTitle("🏆 ĐĂNG KÝ THAM GIA CUSTOM 🏆")
      .setColor(guildConfig.EMBED_COLOR_2 || 0x5865f2)
    //   .setThumbnail(message.guild.iconURL({ size: 256 }))
      .setDescription(`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("register")} **ĐĂNG KÝ THAM GIA**
• Nhấn nút bên dưới để đăng ký tham gia giải custom
• Yêu cầu: Phải là thành viên chính thức của clan

${getEmoji("support")} **HỖ TRỢ & GIẢI ĐÁP**
• Có thắc mắc về giải đấu? Cần hỗ trợ?
• Nhấn nút "HỖ TRỢ" để được tạo kênh riêng

${getEmoji("sponsor")} **TRỞ THÀNH NHÀ TÀI TRỢ**
• Muốn đóng góp cho các giải đấu tiếp theo?
• Nhấn nút "TRỞ THÀNH NHÀ TÀI TRỢ" để được hỗ trợ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("warning")} **LƯU Ý QUAN TRỌNG**
• Đọc kỹ luật lệ trước khi đăng ký
• Giữ tinh thần thể thao, fair-play
• Tuân thủ quyết định của Ban Tổ Chức

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**${guildConfig.CLAN_NAME || "Clan của chúng tôi"}** - Nơi ươm mầm tài năng!
      `)
      .setFooter({ 
        text: `CUSTOM THÁNG 5/2026 • ${new Date().toLocaleDateString('vi-VN')}`, 
        iconURL: message.guild.iconURL() 
      })
      .setTimestamp();

    // Tạo 3 nút bấm
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("custom_register")
          .setLabel("📝 ĐĂNG KÝ THAM GIA CUSTOM")
          .setStyle(ButtonStyle.Success)
          .setEmoji("✅"),
        new ButtonBuilder()
          .setCustomId("custom_support")
          .setLabel("🆘 HỖ TRỢ")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("💬"),
        new ButtonBuilder()
          .setCustomId("custom_sponsor")
          .setLabel("💎 TRỞ THÀNH NHÀ TÀI TRỢ")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("🤝")
      );

    // Gửi form đăng ký
    await message.channel.send({
    //   content: `📢 **THÔNG BÁO GIẢI CUSTOM** 📢\n${getEmoji("bell")} <@&${guildConfig.APPROVER_ROLE_IDS?.[0] || ""}>`,
      embeds: [embed],
      components: [row]
    });

    // Thông báo thành công
    await message.reply({
      content: `✅ Đã gửi form đăng ký giải custom thành công!\n📌 Kênh thông báo: ${notificationChannel ? notificationChannel.toString() : "Đã tạo"}`,
      flags: 64
    });

    console.log(`✅ ${message.author.tag} đã tạo form custom tại ${message.guild.name}`);
  },

  // Xử lý tất cả interactions
  async handleInteraction(interaction, client) {
    // Xử lý Modal submit
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("register_modal_")) {
        await this.handleRegisterModal(interaction, client);
      }
      return;
    }

    // Xử lý Button
    if (!interaction.isButton()) return;

    const guildConfig = getGuildConfig(interaction.guild.id);
    if (!guildConfig) return;

    // ========== NÚT ĐĂNG KÝ THAM GIA ==========
    if (interaction.customId === "custom_register") {
      const member = interaction.member;
      const requiredRoleId = guildConfig.MEMBER_ROLE_ID;
      const clanName = guildConfig.CLAN_NAME || "Clan";
      
      // Kiểm tra role clan
      const hasClanRole = requiredRoleId ? member.roles.cache.has(requiredRoleId) : false;
      
      if (!hasClanRole) {
        const adminRoleIds = guildConfig.APPROVER_ROLE_IDS || [];
        const adminMentions = adminRoleIds.map(roleId => `<@&${roleId}>`).join(" ");
        
        const embed = new EmbedBuilder()
          .setTitle("❌ KHÔNG THỂ ĐĂNG KÝ")
          .setColor(0xff0000)
          .setDescription(`
${getEmoji("error")} **Bạn chưa phải là thành viên của clan ${clanName}**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("info")} **Để tham gia giải custom, bạn cần:**
1️⃣ Trở thành thành viên chính thức của clan
2️⃣ Đọc kỹ nội quy và luật lệ của clan
3️⃣ Liên hệ với Ban Quản Trị để được hỗ trợ

${getEmoji("contact")} **Liên hệ ngay:**
${adminMentions || "@Admin"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("heart")} Cảm ơn bạn đã quan tâm đến giải đấu của chúng tôi!
          `)
          .setFooter({ text: "Hãy trở thành thành viên để tham gia nhé!" });
        
        return interaction.reply({ embeds: [embed], flags: 64 });
      }
      
      // Tạo Modal nhập ID ingame
      const modal = new ModalBuilder()
        .setCustomId(`register_modal_${member.id}`)
        .setTitle("📝 ĐĂNG KÝ THAM GIA CUSTOM");
      
      const ingameIdInput = new TextInputBuilder()
        .setCustomId("ingame_id")
        .setLabel("🎮 Hãy nhập ID ingame của bạn")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Ví dụ: ShadowTiger_123")
        .setRequired(true)
        .setMaxLength(50);
      
      const firstRow = new ActionRowBuilder().addComponents(ingameIdInput);
      modal.addComponents(firstRow);
      
      await interaction.showModal(modal);
      return;
    }
    
    // ========== NÚT HỖ TRỢ ==========
    if (interaction.customId === "custom_support") {
      await interaction.deferReply({ flags: 64 });
      
      const member = interaction.member;
      const guild = interaction.guild;
      const adminRoleIds = guildConfig.APPROVER_ROLE_IDS || [];
      const sponsorRoleId = guildConfig.SPONSOR_ROLE_ID; // Role cho nhà tài trợ
      
      try {
        // Tìm hoặc tạo category HỖ TRỢ
        let supportCategory = guild.channels.cache.find(
          ch => ch.type === ChannelType.GuildCategory && ch.name === SUPPORT_CATEGORY_NAME
        );
        
        if (!supportCategory) {
          supportCategory = await guild.channels.create({
            name: SUPPORT_CATEGORY_NAME,
            type: ChannelType.GuildCategory,
            position: 0
          });
          console.log(`✅ Đã tạo category ${SUPPORT_CATEGORY_NAME}`);
        }
        
        // Đếm số kênh hiện có
        const existingChannels = supportCategory.children.cache.filter(
          ch => ch.name.startsWith("ho-tro-")
        ).size;
        
        const channelNumber = existingChannels + 1;
        const channelName = `ho-tro-${channelNumber}`;
        
        // Tạo kênh riêng tư
        const supportChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: supportCategory.id,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: member.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions, PermissionFlagsBits.AttachFiles],
            },
            {
              id: client.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
            }
          ]
        });
        
        // Thêm quyền cho Admin và Mod
        for (const roleId of adminRoleIds) {
          await supportChannel.permissionOverwrites.create(roleId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true,
            ManageChannels: true
          });
        }
        
        // Cập nhật số kênh
        supportChannelCount.set(guild.id, channelNumber);
        
        // Tag admin và mod
        const adminMentions = adminRoleIds.map(roleId => `<@&${roleId}>`).join(" ");
        
        // Gửi tin nhắn trong kênh hỗ trợ
        const supportEmbed = new EmbedBuilder()
          .setTitle("🆘 KÊNH HỖ TRỢ")
          .setColor(0x00ff00)
          .setDescription(`
${getEmoji("user")} **Người cần hỗ trợ:** ${member.toString()}
${getEmoji("time")} **Thời gian tạo:** <t:${Math.floor(Date.now() / 1000)}:F>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("info")} **Vui lòng mô tả vấn đề bạn cần hỗ trợ**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("warning")} **Lưu ý:** Admin/Mod sẽ hỗ trợ bạn trong thời gian sớm nhất!
          `)
          .setFooter({ text: `Kênh hỗ trợ #${channelNumber}` });
        
        await supportChannel.send({
          content: `${adminMentions} có member cần hỗ trợ! ${getEmoji("alert")}`,
          embeds: [supportEmbed]
        });
        
        const successEmbed = new EmbedBuilder()
          .setTitle("✅ ĐÃ TẠO KÊNH HỖ TRỢ")
          .setColor(0x00ff00)
          .setDescription(`
${getEmoji("tada")} **Kênh hỗ trợ đã được tạo thành công!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("link")} **Truy cập kênh hỗ trợ:** ${supportChannel.toString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("heart")} Admin/Mod sẽ hỗ trợ bạn ngay khi có thể!
          `);
        
        await interaction.editReply({ embeds: [successEmbed] });
        console.log(`✅ Đã tạo kênh hỗ trợ ${channelName} cho ${member.user.tag}`);
        
      } catch (error) {
        console.error("Lỗi khi tạo kênh hỗ trợ:", error);
        await interaction.editReply({
          content: "❌ Có lỗi xảy ra khi tạo kênh hỗ trợ! Vui lòng thử lại sau.",
        });
      }
      return;
    }
    
    // ========== NÚT TRỞ THÀNH NHÀ TÀI TRỢ ==========
    if (interaction.customId === "custom_sponsor") {
      await interaction.deferReply({ flags: 64 });
      
      const member = interaction.member;
      const guild = interaction.guild;
      const adminRoleIds = guildConfig.APPROVER_ROLE_IDS || [];
      const sponsorRoleId = guildConfig.SPONSOR_ROLE_ID;
      
      try {
        // Cấp role nhà tài trợ nếu có
        if (sponsorRoleId && !member.roles.cache.has(sponsorRoleId)) {
          await member.roles.add(sponsorRoleId);
        }
        
        // Tìm hoặc tạo category TÀI TRỢ
        let sponsorCategory = guild.channels.cache.find(
          ch => ch.type === ChannelType.GuildCategory && ch.name === SPONSOR_CATEGORY_NAME
        );
        
        if (!sponsorCategory) {
          sponsorCategory = await guild.channels.create({
            name: SPONSOR_CATEGORY_NAME,
            type: ChannelType.GuildCategory,
            position: 1
          });
          console.log(`✅ Đã tạo category ${SPONSOR_CATEGORY_NAME}`);
        }
        
        // Đếm số kênh hiện có
        const existingChannels = sponsorCategory.children.cache.filter(
          ch => ch.name.startsWith("tai-tro-")
        ).size;
        
        const channelNumber = existingChannels + 1;
        const channelName = `tai-tro-${channelNumber}`;
        
        // Tạo kênh riêng tư
        const sponsorChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: sponsorCategory.id,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: member.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions, PermissionFlagsBits.AttachFiles],
            },
            {
              id: client.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
            }
          ]
        });
        
        // Thêm quyền cho Admin và Mod
        for (const roleId of adminRoleIds) {
          await sponsorChannel.permissionOverwrites.create(roleId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true,
            ManageChannels: true
          });
        }
        
        // Cập nhật số kênh
        sponsorChannelCount.set(guild.id, channelNumber);
        
        // Tag admin và mod
        const adminMentions = adminRoleIds.map(roleId => `<@&${roleId}>`).join(" ");
        
        // Gửi tin nhắn trong kênh tài trợ
        const sponsorEmbed = new EmbedBuilder()
          .setTitle("💎 NHÀ TÀI TRỢ")
          .setColor(0xffaa00)
          .setDescription(`
${getEmoji("user")} **Nhà tài trợ:** ${member.toString()}
${getEmoji("time")} **Thời gian tạo:** <t:${Math.floor(Date.now() / 1000)}:F>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("info")} **Admin/Mod vui lòng liên hệ để trao đổi chi tiết về:**
• Hình thức tài trợ
• Số tiền/ hiện vật tài trợ
• Quyền lợi của nhà tài trợ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("heart")} Cảm ơn nhà tài trợ đã quan tâm đến sự phát triển của clan!
          `)
          .setFooter({ text: `Kênh tài trợ #${channelNumber}` });
        
        await sponsorChannel.send({
          content: `${adminMentions} có nhà tài trợ! ${getEmoji("party")}`,
          embeds: [sponsorEmbed]
        });
        
        const successEmbed = new EmbedBuilder()
          .setTitle("✅ CẢM ƠN BẠN QUAN TÂM!")
          .setColor(0x00ff00)
          .setDescription(`
${getEmoji("tada")} **Cảm ơn bạn đã quan tâm đến việc tài trợ!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("link")} **Kênh trao đổi:** ${sponsorChannel.toString()}

${sponsorRoleId ? `${getEmoji("role")} **Bạn đã được cấp role nhà tài trợ!**` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("heart")} Sự đóng góp của bạn sẽ giúp clan phát triển mạnh mẽ hơn!
          `);
        
        await interaction.editReply({ embeds: [successEmbed] });
        console.log(`✅ Đã tạo kênh tài trợ ${channelName} cho ${member.user.tag}`);
        
      } catch (error) {
        console.error("Lỗi khi tạo kênh tài trợ:", error);
        await interaction.editReply({
          content: "❌ Có lỗi xảy ra khi tạo kênh tài trợ! Vui lòng thử lại sau.",
        });
      }
      return;
    }
  },

  // Xử lý submit modal đăng ký
  async handleRegisterModal(interaction, client) {
    const member = interaction.member;
    const ingameId = interaction.fields.getTextInputValue("ingame_id");
    
    const guildConfig = getGuildConfig(interaction.guild.id);
    if (!guildConfig) {
      return interaction.reply({
        content: "❌ Server chưa được cấu hình!",
        flags: 64
      });
    }
    
    // Tìm kênh thông báo
    let notificationChannel = interaction.guild.channels.cache.find(
      ch => ch.type === ChannelType.GuildText && ch.name === NOTIFICATION_CHANNEL_NAME
    );
    
    // Kênh thi đấu (cấp quyền xem)
    const competitionChannelId = guildConfig.NOTIFICATION_CHANNEL_NAME; // Sử dụng kênh thông báo làm kênh thi đấu luôn, hoặc có thể cấu hình riêng nếu muốn
    let competitionChannel = null;
    if (competitionChannelId) {
      competitionChannel = interaction.guild.channels.cache.get(competitionChannelId);
    }
    
    // Role cấp thêm
    const customRoleId = guildConfig.EXTRA_ROLE_ID_2;
    
    try {
      // Cấp role nếu có
      if (customRoleId && !member.roles.cache.has(customRoleId)) {
        await member.roles.add(customRoleId);
      }
      
      // Cấp quyền xem kênh thi đấu
      if (competitionChannel) {
        await competitionChannel.permissionOverwrites.create(member.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
      }
      
      // Tạo embed thông báo
      const notifyEmbed = new EmbedBuilder()
        .setTitle("🎉 ĐĂNG KÝ THAM GIA CUSTOM THÀNH CÔNG! 🎉")
        .setColor(0x00ff00)
        .setDescription(`
${getEmoji("tada")} **Chúc mừng ${member.toString()} đã đăng ký tham gia custom thành công!** ${getEmoji("tada")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("id")} **ID Ingame:** \`${ingameId}\`
${getEmoji("user")} **Discord:** ${member.user.tag}
${getEmoji("time")} **Thời gian đăng ký:** <t:${Math.floor(Date.now() / 1000)}:F>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("warning")} **⚠️ Lưu ý:**
• Hãy có mặt đúng giờ
• Đọc kỹ thể lệ trước khi thi đấu
• Giữ tinh thần fair-play

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("heart")} Chúc bạn may mắn và tỏa sáng trong giải đấu!
        `)
        .setFooter({ text: `ID đăng ký: ${member.id}`, iconURL: member.user.displayAvatarURL() })
        .setTimestamp();
      
      // Gửi thông báo vào kênh chỉ định
      if (notificationChannel) {
        await notificationChannel.send({
          content: `📢 **CÓ ĐĂNG KÝ MỚI!** ${getEmoji("bell")}`,
          embeds: [notifyEmbed]
        });
      } else {
        // Tạo kênh mới nếu chưa có
        const newChannel = await interaction.guild.channels.create({
          name: NOTIFICATION_CHANNEL_NAME,
          type: ChannelType.GuildText,
          topic: "Kênh thông báo đăng ký tham gia giải custom",
        });
        await newChannel.send({
          content: `📢 **CÓ ĐĂNG KÝ MỚI!** ${getEmoji("bell")}`,
          embeds: [notifyEmbed]
        });
      }
      
      // Phản hồi cho user
      const successEmbed = new EmbedBuilder()
        .setTitle("✅ ĐĂNG KÝ THÀNH CÔNG!")
        .setColor(0x00ff00)
        .setDescription(`
${getEmoji("tada")} **Cảm ơn ${member.toString()} đã đăng ký tham gia giải custom!** ${getEmoji("tada")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("id")} **ID Ingame của bạn:** \`${ingameId}\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${competitionChannel ? `${getEmoji("link")} **Kênh thi đấu:** ${competitionChannel.toString()}\n` : ""}
${getEmoji("info")} **Thông tin chi tiết sẽ được thông báo sau**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getEmoji("heart")} Chúc bạn có những trận đấu thật vui vẻ và hấp dẫn!
        `)
        .setFooter({ text: "Hãy theo dõi kênh thông báo để cập nhật lịch thi đấu!" });
      
      await interaction.reply({ embeds: [successEmbed], flags: 64 });
      
      console.log(`✅ ${member.user.tag} (ID: ${ingameId}) đã đăng ký custom tại ${interaction.guild.name}`);
      
    } catch (error) {
      console.error("Lỗi khi xử lý đăng ký:", error);
      await interaction.reply({
        content: "❌ Có lỗi xảy ra khi đăng ký! Vui lòng thử lại sau hoặc liên hệ Admin.",
        flags: 64
      });
    }
  }
};

// Hàm hỗ trợ lấy emoji
function getEmoji(name) {
  const emojis = {
    star: "⭐",
    register: "📝",
    support: "🆘",
    sponsor: "💎",
    warning: "⚠️",
    error: "❌",
    info: "ℹ️",
    contact: "📞",
    heart: "❤️",
    tada: "🎉",
    party: "🎊",
    user: "👤",
    time: "⏰",
    link: "🔗",
    money: "💰",
    bell: "🔔",
    alert: "🆘",
    id: "🎮",
    role: "🏅"
  };
  return emojis[name] || "•";
}