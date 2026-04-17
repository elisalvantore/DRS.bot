require("dotenv").config(); //npm run dev

const { Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
  ],
});

// Load module role-approval
const roleApproval = require("./role-approval");

// Load module booster-role
const boosterRole = require("./booster-role");

const PREFIX = "!";

// Cooldown cho lệnh !booster-create (1 giây)
const boosterCreateCooldown = new Map();

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot đã online: ${c.user.tag}`);
  roleApproval.init(client);
});

client.on(Events.MessageCreate, async (message) => {
  console.log(`🔵 MessageCreate event fired for: ${message.author.tag}`);
  
  if (message.author.bot) return;

  // ── Xử lý prefix commands ──────────────────────────────────
  if (message.content.startsWith(PREFIX)) {
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ── !ping ──────────────────────────────────────────────────
    if (command === "ping") {
      const sent = await message.reply("🏓 Đang tính...");
      sent.edit(
        `🏓 Pong! Độ trễ: **${sent.createdTimestamp - message.createdTimestamp}ms**`
      );
      return;
    }

    // ── !help ──────────────────────────────────────────────────
    if (command === "help") {
      const embed = new EmbedBuilder()
        .setTitle("📋 Danh sách lệnh")
        .setColor(0x5865f2)
        .setDescription("Danh sách các lệnh hiện có:")
        .addFields(
          { name: "`!ping`", value: "Kiểm tra độ trễ bot", inline: true },
          { name: "`!help`", value: "Hiển thị danh sách lệnh", inline: true },
          { name: "`!info`", value: "Thông tin server", inline: true },
          { name: "`!avatar @user`", value: "Xem avatar thành viên", inline: true }
        )
        .setFooter({ text: "Sẽ có thêm lệnh trong tương lai!" });

      message.reply({ embeds: [embed] });
      return;
    }

    // ── !info ──────────────────────────────────────────────────
    if (command === "info") {
      const guild = message.guild;
      const embed = new EmbedBuilder()
        .setTitle(`ℹ️ Thông tin server: ${guild.name}`)
        .setColor(0x5865f2)
        .setThumbnail(guild.iconURL())
        .addFields(
          { name: "👑 Chủ server", value: `<@${guild.ownerId}>`, inline: true },
          { name: "👥 Thành viên", value: `${guild.memberCount}`, inline: true },
          { name: "📅 Ngày tạo", value: guild.createdAt.toLocaleDateString("vi-VN"), inline: true }
        );
      message.reply({ embeds: [embed] });
      return;
    }

    // ── !avatar ────────────────────────────────────────────────
    if (command === "avatar") {
      const target = message.mentions.users.first() || message.author;
      const embed = new EmbedBuilder()
        .setTitle(`🖼️ Avatar của ${target.username}`)
        .setImage(target.displayAvatarURL({ size: 512 }))
        .setColor(0x5865f2);
      message.reply({ embeds: [embed] });
      return;
    }

    // ── !myid ─────────────────────────────────────────────────
    if (command === "myid") {
      await message.reply({
        content: `🆔 User ID của bạn: \`${message.author.id}\`\n👤 Tên: ${message.author.username}`,
      });
      return;
    }

    // ── !booster-create ────────────────────────────────────────
    if (command === "booster-create") {
      console.log(`🔵 DEBUG: !booster-create called by ${message.author.tag} at ${new Date().toISOString()}`);
      
      // Check cooldown
      const now = Date.now();
      const cooldownKey = `${message.guild.id}-${message.author.id}`;
      const lastUsed = boosterCreateCooldown.get(cooldownKey);
      
      if (lastUsed && now - lastUsed < 1000) {
        console.log(`🔵 DEBUG: Cooldown active, ignoring`);
        return; // Cooldown, bỏ qua
      }
      
      boosterCreateCooldown.set(cooldownKey, now);
      console.log(`🔵 DEBUG: Passed cooldown, proceeding`);
      
      try {
        // Chỉ admin được dùng lệnh setup
        if (!message.member.permissions.has("Administrator")) {
          return message.reply({
            content: "❌ Bạn cần quyền **Admin** để sử dụng lệnh này!",
          });
        }

        const boosterConfig = require("./configs.json")[message.guild.id] || {};

        if (!boosterConfig.BOOSTER_CHANNEL_ID) {
          return message.reply({
            content: "❌ Chưa cấu hình kênh booster trong configs.json!",
          });
        }

        // Gửi form vào kênh
        const channel = await message.guild.channels.fetch(boosterConfig.BOOSTER_CHANNEL_ID).catch(() => null);
        if (!channel) {
          return message.reply({
            content: "❌ Không tìm thấy kênh booster!",
          });
        }

        // Gửi panel bằng module booster-role
        console.log(`🔵 DEBUG: About to send panel`);
        const member = message.member;
        await boosterRole.sendBoosterPanel(channel, member);
        console.log(`🔵 DEBUG: Panel sent successfully`);

        await message.reply({
          content: "✅ Form tạo role đã được gửi vào kênh booster!",
        });
        console.log(`🔵 DEBUG: Reply sent successfully`);
      } catch (err) {
        console.error("Lỗi !booster-create:", err);
        await message.reply({
          content: `❌ Có lỗi xảy ra: ${err.message}`,
        });
      }
      return;
    }

    return; // Không có command nào match
  }

  // ── Xử lý tin nhắn trong kênh đăng ký (không phải prefix command) ──
  // Chỉ xử lý tin nhắn không phải prefix command
  if (!message.content.startsWith(PREFIX)) {
    roleApproval.handleRegisterMessage(message);
  }
});

// Chuyển các sự kiện reaction về role-approval xử lý
client.on(Events.MessageReactionAdd, (reaction, user) => {
  roleApproval.handleReaction(reaction, user, client);
});

// Khi thành viên mới join
client.on(Events.GuildMemberAdd, (member) => {
  roleApproval.handleNewMember(member, client);
});

// Khi thành viên boost server
client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
  boosterRole.handleBoost(oldMember, newMember, client);
});

// Xử lý interaction (button, modal)
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Button & Modal
    await boosterRole.handleInteraction(interaction, client);
  } catch (err) {
    console.error("Lỗi InteractionCreate:", err.message);
    // Chỉ reply nếu interaction chưa được acknowledge
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Có lỗi xảy ra! Vui lòng thử lại.",
          flags: 64, // ephemeral
        });
      } else if (interaction.deferred) {
        // Đã defer, dùng editReply
        await interaction.editReply({
          content: "❌ Có lỗi xảy ra! Vui lòng thử lại.",
        });
      }
    } catch (e) {
      console.error("Không thể phản hồi lỗi:", e.message);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);