const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

// ================================================================
// ⚙️ CẤU HÌNH — Thay tất cả ID bên dưới theo server của bạn
// ================================================================
const CONFIG = {
  // ID kênh đăng ký (nơi user nhắn để xin role)
  REGISTER_CHANNEL_ID: "1493790687576199178",

  // Link dẫn thẳng vào kênh đăng ký
  // Cách lấy: chuột phải vào kênh → Copy Link
  REGISTER_CHANNEL_LINK: "https://discord.com/channels/1143023342656426004/1493790687576199178",

  // Role cấp cho người mới join (để họ thấy được kênh đăng ký)
  GUEST_ROLE_ID: "1493792024615321680",

  // Role bị XÓA khi admin duyệt hoặc từ chối
  PENDING_ROLE_ID: "1493792024615321680",

  // Role được CẤP khi admin duyệt ✅
  MEMBER_ROLE_ID: "1493793073002446928",

  // Role thứ 2 được CẤP thêm khi admin duyệt ✅ (để trống "" nếu không cần)
  EXTRA_ROLE_ID: "",

  // Emoji để admin DUYỆT
  APPROVE_EMOJI: "✅",

  // Emoji để admin TỪ CHỐI
  REJECT_EMOJI: "❌",

  // ID role của admin/mod có quyền duyệt
  APPROVER_ROLE_IDS: ["1437386631152930836"],

  // Tên clan/server để hiển thị trong tin nhắn
  CLAN_NAME: "Clan của chúng tôi",
};
// ================================================================

// Lưu danh sách tin nhắn đang chờ duyệt { messageId: userId }
const pendingMessages = new Map();

// Lưu DM đang chờ phản hồi từ user mới { userId: dmMessageId }
const pendingDMs = new Map();

function isApprover(member) {
  if (member.permissions.has(PermissionFlagsBits.ManageRoles)) return true;
  return CONFIG.APPROVER_ROLE_IDS.some((id) => member.roles.cache.has(id));
}

// ── Khởi tạo module ────────────────────────────────────────────
function init(client) {
  console.log("✅ Module role-approval đã khởi động!");
}

// ── Xử lý thành viên mới join ──────────────────────────────────
async function handleNewMember(member, client) {
  try {
    // Cấp guest role để họ thấy kênh đăng ký
    if (CONFIG.GUEST_ROLE_ID) {
      await member.roles.add(CONFIG.GUEST_ROLE_ID).catch(() => {});
    }

    // Gửi DM hỏi có muốn vào clan không
    const dm = await member.send(
      `👋 Chào **${member.user.username}** đã đến với server!\n\n` +
      `Bạn có muốn tham gia **${CONFIG.CLAN_NAME}** không?\n\n` +
      `✅ — Có, tôi muốn tham gia!\n` +
      `❌ — Không, cảm ơn!`
    );

    // Thêm 2 reaction vào DM
    await dm.react("✅");
    await dm.react("❌");

    // Lưu lại để xử lý sau
    pendingDMs.set(member.id, dm.id);

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
  if (reaction.message.channel.id === CONFIG.REGISTER_CHANNEL_ID) {
    await handleAdminReaction(reaction, user, client);
  }
}

// ── Xử lý khi user react vào DM ───────────────────────────────
async function handleDMReaction(reaction, user, client) {
  // Kiểm tra đây có phải DM mình đã gửi không
  const dmMessageId = pendingDMs.get(user.id);
  if (!dmMessageId || reaction.message.id !== dmMessageId) return;

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
async function handleAdminReaction(reaction, user, client) {
  const guild = reaction.message.guild;
  const approver = await guild.members.fetch(user.id).catch(() => null);

  // Kiểm tra quyền admin/mod
  if (!approver || !isApprover(approver)) {
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
  if (message.channel.id !== CONFIG.REGISTER_CHANNEL_ID) return;
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
  CONFIG,
};