require("dotenv").config();

const { Client, GatewayIntentBits, Events, EmbedBuilder } = require("discord.js");

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

const PREFIX = "!";

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot đã online: ${c.user.tag}`);
  roleApproval.init(client);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ── !ping ──────────────────────────────────────────────────
  if (command === "ping") {
    const sent = await message.reply("🏓 Đang tính...");
    sent.edit(
      `🏓 Pong! Độ trễ: **${sent.createdTimestamp - message.createdTimestamp}ms**`
    );
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
  }

  // ── !avatar ────────────────────────────────────────────────
  if (command === "avatar") {
    const target = message.mentions.users.first() || message.author;
    const embed = new EmbedBuilder()
      .setTitle(`🖼️ Avatar của ${target.username}`)
      .setImage(target.displayAvatarURL({ size: 512 }))
      .setColor(0x5865f2);
    message.reply({ embeds: [embed] });
  }
});

// Xử lý tin nhắn trong kênh đăng ký
client.on(Events.MessageCreate, async (message) => {
  if (!message.author.bot) {
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

client.login(process.env.DISCORD_TOKEN);