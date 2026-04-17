const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

// ================================================================
// ⚙️ CẤU HÌNH
// ================================================================
const configs = require("./configs.json");

function getConfig(guildId) {
  return configs[guildId] || {};
}
// ================================================================

// Lưu role đã tạo theo userId { userId: roleId }
const userCustomRoles = new Map();

// ── Kiểm tra mã màu hex hợp lệ ────────────────────────────────
function isValidHex(hex) {
  return /^#?([0-9A-Fa-f]{6})$/.test(hex.trim());
}

function formatHex(hex) {
  const clean = hex.trim().replace("#", "");
  return parseInt(clean, 16);
}

// ── Gửi giao diện tạo role vào kênh ───────────────────────────
async function sendBoosterPanel(channel, member) {
  const CONFIG = getConfig(member.guild.id);
  
  const embed = new EmbedBuilder()
    .setTitle("🎨 Tạo Role Riêng")
    .setDescription(
      `Chào các **Booster**! 🚀\n\n` +
      `Nếu bạn đã boost server, bạn được phép tạo **1 role riêng** với tên và màu tùy chỉnh.\n\n` +
      `**Nút 1** — Tạo role mới *(chỉ dùng được 1 lần)*\n` +
      `**Nút 2** — Đổi màu role\n` +
      `**Nút 3** — Đổi tên role\n` +
      `**Nút 4** — Xóa role`
    )
    .setColor(CONFIG.EMBED_COLOR)
    .setFooter({ text: "Mỗi booster chỉ được tạo 1 role duy nhất!" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`booster_create_panel`)
      .setLabel("✨ Tạo Role")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`booster_color_panel`)
      .setLabel("🎨 Đổi Màu")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`booster_rename_panel`)
      .setLabel("✏️ Đổi Tên")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`booster_delete_panel`)
      .setLabel("🗑️ Xóa Role")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

// ── Xử lý khi có người boost server ───────────────────────────
async function handleBoost(oldMember, newMember, client) {
  const CONFIG = getConfig(newMember.guild.id);
  
  const hadBoost = oldMember.premiumSince;
  const hasBoost = newMember.premiumSince;

  // Chỉ xử lý khi VỪA boost (chưa có → có)
  if (hadBoost || !hasBoost) return;

  console.log(`🚀 ${newMember.user.tag} vừa boost server!`);

  try {
    // Gửi DM cảm ơn
    await newMember.send(
      `🎉 Cảm ơn **${newMember.user.username}** đã boost server!\n\n` +
      `Để tri ân, bạn được phép tạo **1 role riêng** với tên và màu tùy chỉnh!\n\n` +
      `👉 Dùng lệnh **\`/booster-create\`** trong kênh booster để tạo role`
    ).catch(() => {});
  } catch (err) {
    console.error("Lỗi xử lý boost:", err.message);
  }
}

// ── Xử lý các button interaction ──────────────────────────────
async function handleInteraction(interaction, client) {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;

  const CONFIG = getConfig(interaction.guild.id);
  
  const id = interaction.customId;
  if (!id.startsWith("booster_")) return;

  const parts = id.split("_");
  const action = parts[1]; // create | color | rename | delete | deleteconfirm | deletecancel | colorsubmit | renamesubmit | createsubmit
  const panelType = parts[2]; // "panel" = công khai, hoặc userId

  // Panel chung (công khai) - ai cũng được dùng
  // Panel riêng (có userId) - chỉ người đó được dùng
  if (panelType !== "panel") {
    // Panel cũ (riêng) - không dùng nữa, nhưng vẫn compatible
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) return;

  // Kiểm tra còn boost không (hoặc user được phép bypass)
  const isAllowed = CONFIG.ALLOWED_BOOSTER_IDS && CONFIG.ALLOWED_BOOSTER_IDS.includes(interaction.user.id);
  
  if (!member.premiumSince && !isAllowed) {
    // Sử dụng try-catch để tránh error 10062
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Bạn cần boost server để sử dụng tính năng này!",
          flags: 64, // ephemeral
        });
      }
    } catch (err) {
      console.error("Lỗi khi reply boost check:", err.message);
    }
    return;
  }

  // ── NÚT 1: TẠO ROLE ────────────────────────────────────────
if (action === "create") {
  try {
    // Kiểm tra nếu user đã có role, nhưng role bị xóa thì cho phép tạo lại
    if (userCustomRoles.has(interaction.user.id)) {
      const roleId = userCustomRoles.get(interaction.user.id);
      const role = interaction.guild.roles.cache.get(roleId);
      
      if (role) {
        return interaction.reply({
          content: "⚠️ Bạn đã tạo role rồi! Vui lòng chỉ **đổi tên** hoặc **đổi màu** thôi nhé.",
          flags: 64,
        });
      } else {
        userCustomRoles.delete(interaction.user.id);
      }
    }

    // Mở modal nhập tên role
    const modal = new ModalBuilder()
      .setCustomId(`booster_createsubmit`) // 🔧 SỬA: Bỏ ${interaction.user.id}
      .setTitle("✨ Tạo Role Riêng");

    const nameInput = new TextInputBuilder()
      .setCustomId("role_name")
      .setLabel("Hãy đặt tên cho role của bạn")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("VD: The Overlord")
      .setMaxLength(50)
      .setRequired(true);

    const colorInput = new TextInputBuilder()
      .setCustomId("role_color")
      .setLabel("Mã màu HEX (VD: #FF5733 hoặc FF5733)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("#FF5733")
      .setMaxLength(7)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(colorInput)
    );

    await interaction.showModal(modal);
  } catch (err) {
    console.error("Lỗi button create:", err.message);
  }
  return;
}

// ── NÚT 2: ĐỔI MÀU ────────────────────────────────────────
if (action === "color") {
  try {
    if (!userCustomRoles.has(interaction.user.id)) {
      return interaction.reply({
        content: "❌ Bạn chưa có role riêng. Hãy tạo role trước!",
        flags: 64,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`booster_colorsubmit`) // 🔧 Bỏ userId
      .setTitle("🎨 Đổi Màu Role");

    const colorInput = new TextInputBuilder()
      .setCustomId("role_color")
      .setLabel("Nhập mã màu HEX mới")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("#FF5733")
      .setMaxLength(7)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(colorInput));
    await interaction.showModal(modal);
  } catch (err) {
    console.error("Lỗi button color:", err.message);
  }
  return;
}

// ── NÚT 3: ĐỔI TÊN ────────────────────────────────────────
if (action === "rename") {
  try {
    if (!userCustomRoles.has(interaction.user.id)) {
      return interaction.reply({
        content: "❌ Bạn chưa có role riêng. Hãy tạo role trước!",
        flags: 64,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`booster_renamesubmit`) // 🔧 Bỏ userId
      .setTitle("✏️ Đổi Tên Role");

    const nameInput = new TextInputBuilder()
      .setCustomId("role_name")
      .setLabel("Nhập tên mới cho role")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("VD: The Overlord")
      .setMaxLength(50)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
    await interaction.showModal(modal);
  } catch (err) {
    console.error("Lỗi button rename:", err.message);
  }
  return;
}

  // ── NÚT 4: XÓA ROLE ────────────────────────────────────────
  if (action === "delete") {
    try {
      const roleId = userCustomRoles.get(interaction.user.id);
      
      if (!roleId) {
        return interaction.reply({
          content: "❌ Bạn chưa có role riêng. Không có gì để xóa!",
          flags: 64, // ephemeral
        });
      }

      const role = interaction.guild.roles.cache.get(roleId);

      if (!role) {
        userCustomRoles.delete(interaction.user.id);
        return interaction.reply({
          content: "❌ Role của bạn không còn tồn tại. Đã xóa khỏi hệ thống.",
          flags: 64, // ephemeral
        });
      }

      // Hiển thị xác nhận
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`booster_deleteconfirm_${interaction.user.id}`)
          .setLabel("✅ Xác Nhận Xóa")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`booster_deletecancel_${interaction.user.id}`)
          .setLabel("❌ Hủy")
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({
        content: `⚠️ Bạn chắc chứ? Nếu xóa role ${role} sẽ **mất vĩnh viễn**!\n\n💾 Bạn có thể **tạo lại** role mới sau đó.`,
        components: [confirmRow],
        flags: 64, // ephemeral
      });
    } catch (err) {
      console.error("Lỗi button delete:", err.message);
    }
    return;
  }

  // ── BUTTON: XÁC NHẬN XÓA ────────────────────────────────────
  if (action === "deleteconfirm") {
    const roleId = userCustomRoles.get(interaction.user.id);
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
      userCustomRoles.delete(interaction.user.id);
      return interaction.reply({
        content: "❌ Role không còn tồn tại rồi!",
        flags: 64, // ephemeral
      });
    }

    try {
      await interaction.deferReply({ flags: 64 }); // ephemeral
      await role.delete(`Xóa role của ${interaction.user.tag}`);
      userCustomRoles.delete(interaction.user.id);

      await interaction.editReply({
        content: `✅ Đã xóa role **${role.name}** thành công!\n\n💡 Bạn có thể **tạo role mới** bất cứ lúc nào.`,
      });

      console.log(`🗑️ Đã xóa role của ${interaction.user.tag}`);
    } catch (err) {
      console.error("Lỗi xóa role:", err.message);
      await interaction.editReply({
        content: "❌ Có lỗi khi xóa role! Kiểm tra lại quyền bot.",
      });
    }
    return;
  }

  // ── BUTTON: HỦY XÓA ─────────────────────────────────────────
  if (action === "deletecancel") {
    try {
      await interaction.reply({
        content: "❌ Đã hủy xóa role.",
        flags: 64, // ephemeral
      });
    } catch (err) {
      console.error("Lỗi button deletecancel:", err.message);
    }
    return;
  }

  // ── MODAL SUBMIT: TẠO ROLE ─────────────────────────────────
if (action === "createsubmit") {  // 🔧 Không cần check userId trong customId nữa
  try {
    // Lấy user từ interaction (đảm bảo đúng người submit)
    const userId = interaction.user.id;
    const member = await interaction.guild.members.fetch(userId);
    
    await interaction.deferReply({ flags: 64 });

    const roleName = interaction.fields.getTextInputValue("role_name").trim();
    const roleColorRaw = interaction.fields.getTextInputValue("role_color").trim();

    if (!isValidHex(roleColorRaw)) {
      return interaction.editReply({
        content: "❌ Mã màu không hợp lệ! Vui lòng nhập đúng định dạng hex VD: `#FF5733` hoặc `FF5733`",
      });
    }

    const roleColor = formatHex(roleColorRaw);

    // Kiểm tra lại xem user đã có role chưa (tránh tạo 2 lần)
    if (userCustomRoles.has(userId)) {
      const existingRoleId = userCustomRoles.get(userId);
      const existingRole = interaction.guild.roles.cache.get(existingRoleId);
      if (existingRole) {
        return interaction.editReply({
          content: "⚠️ Bạn đã có role riêng rồi! Dùng nút Đổi Màu hoặc Đổi Tên để chỉnh sửa.",
        });
      } else {
        userCustomRoles.delete(userId);
      }
    }

    try {
      const guild = interaction.guild;
      const CONFIG = getConfig(guild.id);

      // Tìm vị trí role booster để đặt role mới bên trên
      const boosterRole = guild.roles.cache.get(CONFIG.BOOSTER_ROLE_ID);
      const position = boosterRole ? boosterRole.position + 1 : 1;

      // Tạo role mới
      const newRole = await guild.roles.create({
        name: roleName,
        color: roleColor,
        position: position,
        reason: `Role riêng của booster ${interaction.user.tag}`,
      });

      // Cấp role cho người dùng
      await member.roles.add(newRole);

      // Lưu lại
      userCustomRoles.set(userId, newRole.id);

      await interaction.editReply({
        content: `🎉 Bạn đã tạo role ${newRole} thành công!\nCảm ơn bạn đã boost server! 💜`,
      });

      console.log(`✅ Đã tạo role "${roleName}" cho ${interaction.user.tag}`);
    } catch (err) {
      console.error("Lỗi tạo role:", err.message);
      await interaction.editReply({
        content: "❌ Có lỗi khi tạo role! Kiểm tra lại quyền bot.\n" + 
                 "Bot cần có quyền **Manage Roles** và role của bot phải cao hơn role cần tạo.",
      });
    }
  } catch (err) {
    console.error("Lỗi modal submit:", err.message);
    try {
      await interaction.editReply({
        content: "❌ Có lỗi xảy ra! Vui lòng thử lại.",
      });
    } catch (e) {
      console.error("Lỗi khi gửi error message:", e.message);
    }
  }
  return;
}

  // ── MODAL SUBMIT: ĐỔI MÀU ─────────────────────────────────
  if (action === "colorsubmit") {
    try {
      await interaction.deferReply({ flags: 64 }); // ephemeral

      const roleColorRaw = interaction.fields.getTextInputValue("role_color").trim();

      if (!isValidHex(roleColorRaw)) {
        return interaction.editReply({
          content: "❌ Mã màu không hợp lệ! Vui lòng nhập đúng định dạng hex VD: `#FF5733`",
        });
      }

      const roleColor = formatHex(roleColorRaw);
      const roleId = userCustomRoles.get(interaction.user.id);
      const role = interaction.guild.roles.cache.get(roleId);

      if (!role) {
        userCustomRoles.delete(interaction.user.id);
        return interaction.editReply({
          content: "❌ Role của bạn không còn tồn tại. Hãy tạo lại!",
        });
      }

      await role.setColor(roleColor);
      await interaction.editReply({
        content: `✅ Đã đổi màu role ${role} thành công!`,
      });
    } catch (err) {
      console.error("Lỗi đổi màu:", err.message);
      try {
        await interaction.editReply({
          content: "❌ Có lỗi xảy ra! Vui lòng thử lại.",
        });
      } catch (e) {
        console.error("Lỗi khi gửi error message:", e.message);
      }
    }
    return;
  }

  // ── MODAL SUBMIT: ĐỔI TÊN ─────────────────────────────────
  if (action === "renamesubmit") {
    try {
      await interaction.deferReply({ flags: 64 }); // ephemeral

      const roleName = interaction.fields.getTextInputValue("role_name").trim();
      const roleId = userCustomRoles.get(interaction.user.id);
      const role = interaction.guild.roles.cache.get(roleId);

      if (!role) {
        userCustomRoles.delete(interaction.user.id);
        return interaction.editReply({
          content: "❌ Role của bạn không còn tồn tại. Hãy tạo lại!",
        });
      }

      await role.setName(roleName);
      await interaction.editReply({
        content: `✅ Đã đổi tên role thành **${roleName}** thành công!`,
      });
    } catch (err) {
      console.error("Lỗi đổi tên:", err.message);
      try {
        await interaction.editReply({
          content: "❌ Có lỗi xảy ra! Vui lòng thử lại.",
        });
      } catch (e) {
        console.error("Lỗi khi gửi error message:", e.message);
      }
    }
  }
}

module.exports = {
  handleBoost,
  handleInteraction,
  sendBoosterPanel,
};