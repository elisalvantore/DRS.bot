const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

// ================================================================
// ⚙️ LOAD CONFIGS TỪ FILE JSON — Hỗ trợ nhiều server
// ================================================================
let CONFIGS = {};
try {
  const configPath = path.join(__dirname, "configs.json");
  CONFIGS = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  console.log("✅ Đã load configs từ configs.json");
} catch (err) {
  console.error("❌ Lỗi khi load configs.json:", err.message);
  CONFIGS = {};
}

// Hàm lấy config cho một server cụ thể (dựa trên guildId)
function getGuildConfig(guildId) {
  return CONFIGS[guildId] || null;
}
// ================================================================

// Lưu danh sách tin nhắn đang chờ duyệt { messageId: userId }
const pendingMessages = new Map();

// Lưu DM đang chờ phản hồi từ user mới { userId: { dmMessageId, guildId } }
const pendingDMs = new Map();

function isApprover(member, config) {
  if (!config) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageRoles)) return true;
  return config.APPROVER_ROLE_IDS.some((id) => member.roles.cache.has(id));
}

// ── Khởi tạo module ────────────────────────────────────────────
function init(client) {
  console.log("✅ Module role-approval đã khởi động!");
}

// ── Xử lý thành viên mới join ──────────────────────────────────
async function handleNewMember(member, client) {
  try {
    const CONFIG = getGuildConfig(member.guild.id);
    if (!CONFIG) {
      console.warn(`⚠️ Không tìm thấy config cho server: ${member.guild.id}`);
      return;
    }

    // Cấp guest role để họ thấy kênh đăng ký
    if (CONFIG.GUEST_ROLE_ID) {
      await member.roles.add(CONFIG.GUEST_ROLE_ID).catch(() => {});
    }

    // Gửi DM hỏi có muốn vào clan không
    const embed = new EmbedBuilder()
      .setColor(0xff3b3b)
      .setTitle("👋 Welcome to Demon Rise")
      .setDescription(
        `🔥 Chào mừng chiến binh **${member.user.username}**!\n\n` +
        `Bạn vừa đặt chân vào lãnh địa của chúng tôi.\n` +
        `Chúng tôi rất vui khi có bạn ở đây.\n\n` +
        `Bạn có muốn gia nhập **${CONFIG.CLAN_NAME}** để cùng chiến đấu và phát triển không?\n\n` +
        `**— ⚔️ Nhấn ✅ để gia nhập**\n` +
        `**— 🕊️ Nhấn ❌ nếu bạn chỉ muốn tham quan**`
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setImage("https://i.pinimg.com/736x/87/ff/05/87ff057d6adfe542c757e6aa466e4265.jpg")
      .setFooter({ text: "Demon Rise Server" })
      .setTimestamp();

    const dm = await member.send({
      embeds: [embed]
    });

    // Thêm 2 reaction vào DM
    await dm.react("✅");
    await dm.react("❌");

    // Lưu lại để xử lý sau { messageId, guildId }
    pendingDMs.set(member.id, { dmMessageId: dm.id, guildId: member.guild.id });

    console.log(`📩 Đã gửi DM cho thành viên mới: ${member.user.tag}`);
  } catch (err) {
    console.error(`Không thể gửi DM cho ${member.user.tag}:`, err.message);
  }
}

// ── Xử lý tất cả reaction ──────────────────────────────────────
async function handleReaction(reaction, user, client) {
  if (user.bot) return;

  // Xử lý partial
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch { return; }
  }

  const isDM = !reaction.message.guild;

  // ── TRƯỜNG HỢP 1: User react vào DM của bot ──────────────
  if (isDM) {
    await handleDMReaction(reaction, user, client);
    return;
  }

  // ── TRƯỜNG HỢP 2: Admin react vào tin nhắn trong kênh đăng ký ──
  const CONFIG = getGuildConfig(reaction.message.guild.id);
  if (!CONFIG) return;

  if (reaction.message.channel.id === CONFIG.REGISTER_CHANNEL_ID) {
    await handleAdminReaction(reaction, user, client, CONFIG);
  }
}

// ── Xử lý khi user react vào DM ───────────────────────────────
async function handleDMReaction(reaction, user, client) {
  // Kiểm tra đây có phải DM mình đã gửi không
  const dmData = pendingDMs.get(user.id);
  if (!dmData || reaction.message.id !== dmData.dmMessageId) return;

  const CONFIG = getGuildConfig(dmData.guildId);
  if (!CONFIG) return;

  const emoji = reaction.emoji.name;

  if (emoji === "✅") {
    // User đồng ý → gửi link kênh đăng ký
    await reaction.message.channel.send(
      `🎉 Tuyệt vời! Hãy vào kênh đăng ký bên dưới và nhắn tin để được admin duyệt nhé:\n` +
      `👉 ${CONFIG.REGISTER_CHANNEL_LINK}\n\n` +
      `Hãy giới thiệu bản thân trong kênh đó để được cấp role thành viên!`
    );

    // Cấp pending role để họ thấy kênh đăng ký
    try {
      const guilds = client.guilds.cache;
      for (const [, guild] of guilds) {
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (member && CONFIG.PENDING_ROLE_ID) {
          await member.roles.add(CONFIG.PENDING_ROLE_ID).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Lỗi cấp pending role:", err.message);
    }

  } else if (emoji === "❌") {
    // User từ chối
    await reaction.message.channel.send(
      `😊 Cảm ơn bạn đã ghé thăm server!\n` +
      `Chúc bạn có những giây phút vui vẻ. Nếu đổi ý, cứ nhắn tin cho admin nhé! 👋`
    );
  }

  // Xóa khỏi danh sách chờ
  pendingDMs.delete(user.id);
}

// ── Xử lý khi admin react trong kênh đăng ký ──────────────────
async function handleAdminReaction(reaction, user, client, CONFIG) {
  const guild = reaction.message.guild;
  const approver = await guild.members.fetch(user.id).catch(() => null);

  // Kiểm tra quyền admin/mod
  if (!approver || !isApprover(approver, CONFIG)) {
    await reaction.users.remove(user.id).catch(() => {});
    return;
  }

  const emoji = reaction.emoji.name;
  if (emoji !== CONFIG.APPROVE_EMOJI && emoji !== CONFIG.REJECT_EMOJI) return;

  // Lấy thông tin người gửi tin nhắn gốc
  const targetUser = reaction.message.author;
  if (!targetUser || targetUser.bot) return;

  const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
  if (!targetMember) return;

  if (emoji === CONFIG.APPROVE_EMOJI) {
    // ── DUYỆT ✅ ──────────────────────────────────────────
    try {
      // Cấp role thành viên
      await targetMember.roles.add(CONFIG.MEMBER_ROLE_ID);

      // Cấp thêm role phụ nếu có
      if (CONFIG.EXTRA_ROLE_ID) {
        await targetMember.roles.add(CONFIG.EXTRA_ROLE_ID);
      }

      // Xóa role pending
      if (CONFIG.PENDING_ROLE_ID && targetMember.roles.cache.has(CONFIG.PENDING_ROLE_ID)) {
        await targetMember.roles.remove(CONFIG.PENDING_ROLE_ID);
      }

      // Xóa role thứ 2 nếu có
      if (CONFIG.DELETE_ROLE_2_ID && targetMember.roles.cache.has(CONFIG.DELETE_ROLE_2_ID)) {
        await targetMember.roles.remove(CONFIG.DELETE_ROLE_2_ID);
      }

      // Xóa guest role
      if (CONFIG.GUEST_ROLE_ID && targetMember.roles.cache.has(CONFIG.GUEST_ROLE_ID)) {
        await targetMember.roles.remove(CONFIG.GUEST_ROLE_ID);
      }

      // Gửi DM thông báo được duyệt
      await targetUser.send(
        `🎉 Chúc mừng **${targetUser.username}**!\n` +
        `Bạn đã được **${approver.user.username}** duyệt và chính thức là thành viên của **${CONFIG.CLAN_NAME}**!\n\n` +
        `Chào mừng bạn đến với gia đình! 🥳`
      ).catch(() => {});

      // Thông báo trong kênh
      await reaction.message.channel.send(
        `✅ <@${targetUser.id}> đã được **${approver.user.username}** duyệt vào clan!`
      );

      // Xóa tất cả reaction trên tin nhắn
      await reaction.message.reactions.removeAll().catch(() => {});

      console.log(`✅ Đã duyệt ${targetUser.tag} bởi ${approver.user.tag}`);
    } catch (err) {
      console.error("Lỗi khi duyệt:", err.message);
      await reaction.message.channel.send(`❌ Lỗi khi xử lý! Kiểm tra lại quyền bot.`);
    }

  } else if (emoji === CONFIG.REJECT_EMOJI) {
    // ── TỪ CHỐI ❌ ────────────────────────────────────────
    try {
      // Xóa pending role
      if (CONFIG.PENDING_ROLE_ID && targetMember.roles.cache.has(CONFIG.PENDING_ROLE_ID)) {
        await targetMember.roles.remove(CONFIG.PENDING_ROLE_ID);
      }

      // Gửi DM thông báo bị từ chối
      await targetUser.send(
        `😔 Xin lỗi **${targetUser.username}**!\n` +
        `Đơn đăng ký của bạn vào **${CONFIG.CLAN_NAME}** đã bị từ chối.\n\n` +
        `Nếu bạn muốn thử lại hoặc cần thêm thông tin, hãy liên hệ admin nhé! 💪`
      ).catch(() => {});

      // Thông báo trong kênh
      await reaction.message.channel.send(
        `❌ Đơn đăng ký của <@${targetUser.id}> đã bị **${approver.user.username}** từ chối.`
      );

      // Xóa tất cả reaction trên tin nhắn
      await reaction.message.reactions.removeAll().catch(() => {});

      console.log(`❌ Đã từ chối ${targetUser.tag} bởi ${approver.user.tag}`);
    } catch (err) {
      console.error("Lỗi khi từ chối:", err.message);
    }
  }
}

// ── Xử lý tin nhắn mới trong kênh đăng ký ─────────────────────
async function handleRegisterMessage(message) {
  const CONFIG = getGuildConfig(message.guild.id);
  if (!CONFIG || message.channel.id !== CONFIG.REGISTER_CHANNEL_ID) return;
  if (message.author.bot) return;

  try {
    await message.react(CONFIG.APPROVE_EMOJI);
    await message.react(CONFIG.REJECT_EMOJI);
    console.log(`📩 Đã thêm emoji duyệt cho tin nhắn của ${message.author.tag}`);
  } catch (err) {
    console.error("Lỗi khi react:", err.message);
  }
}

module.exports = {
  init,
  handleNewMember,
  handleReaction,
  handleRegisterMessage,
  getGuildConfig,
};