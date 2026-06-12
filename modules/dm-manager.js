// modules/dm-manager.js
const fs = require('fs');
const path = require('path');

// File lưu trữ nội dung DM
const DM_CONTENTS_FILE = path.join(__dirname, '..', 'dm-contents.json');

// Load nội dung từ file
let dmContents = [];
if (fs.existsSync(DM_CONTENTS_FILE)) {
  try {
    dmContents = JSON.parse(fs.readFileSync(DM_CONTENTS_FILE, 'utf8'));
  } catch (e) {
    console.error("Lỗi load dm-contents:", e);
    dmContents = [];
  }
}

// Lưu nội dung
function saveDMContents() {
  fs.writeFileSync(DM_CONTENTS_FILE, JSON.stringify(dmContents, null, 2));
}

module.exports = {
  name: "dm-manager",
  
  // Lệnh 1: Tạo nội dung DM
  async createDM(message, args, client) {
    // Kiểm tra quyền Admin
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Bạn cần quyền **Administrator** để sử dụng lệnh này!");
    }

    const content = args.join(" ");
    if (!content) {
      return message.reply(`❌ Cú pháp: \`!createdm <nội dung>\`\n\n📝 Ví dụ: \`!createdm Chào mừng bạn đến với clan!\``);
    }

    // Thêm nội dung mới
    const newId = dmContents.length + 1;
    dmContents.push({
      id: newId,
      content: content,
      createdBy: message.author.tag,
      createdAt: new Date()
    });

    saveDMContents();

    await message.reply(`✅ **ĐÃ LƯU NỘI DUNG DM #${newId}**\n\n📝 Nội dung: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}\n\nDùng \`!listdm\` để xem danh sách.`);
  },

  // Lệnh 2: Xem danh sách nội dung
  async listDM(message, args, client) {
    if (dmContents.length === 0) {
      return message.reply("📭 **CHƯA CÓ NỘI DUNG NÀO!**\n\nHãy dùng `!createdm <nội dung>` để tạo nội dung DM.");
    }

    let list = "📋 **DANH SÁCH NỘI DUNG DM** 📋\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    
    for (const item of dmContents) {
      list += `**#${item.id}** - ${item.content.substring(0, 80)}${item.content.length > 80 ? '...' : ''}\n`;
      list += `└ 👤 Tạo bởi: ${item.createdBy} | 📅 ${new Date(item.createdAt).toLocaleString('vi-VN')}\n\n`;
    }

    list += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 **Tổng số:** ${dmContents.length} nội dung\n💡 Dùng \`!dm @user <số>\` để gửi DM`;

    // Chia nhỏ nếu nội dung quá dài
    if (list.length > 2000) {
      const chunks = [];
      let currentChunk = "";
      for (const item of dmContents) {
        const itemText = `**#${item.id}** - ${item.content.substring(0, 80)}${item.content.length > 80 ? '...' : ''}\n└ 👤 ${item.createdBy} | 📅 ${new Date(item.createdAt).toLocaleString('vi-VN')}\n\n`;
        if ((currentChunk + itemText).length > 1900) {
          chunks.push(currentChunk);
          currentChunk = itemText;
        } else {
          currentChunk += itemText;
        }
      }
      chunks.push(currentChunk);
      
      for (let i = 0; i < chunks.length; i++) {
        await message.reply(`📋 **DANH SÁCH NỘI DUNG DM (${i+1}/${chunks.length})** 📋\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${chunks[i]}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      }
    } else {
      await message.reply(list);
    }
  },

  // Lệnh 3: Gửi DM cho người dùng
  async sendDM(message, args, client) {
    // Kiểm tra quyền Admin
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Bạn cần quyền **Administrator** để sử dụng lệnh này!");
    }

    // Lấy user được tag
    const userMention = message.mentions.users.first();
    if (!userMention) {
      return message.reply(`❌ Cú pháp: \`!dm @người_dùng <số_nội_dung>\`\n\n📝 Ví dụ: \`!dm @ABC 1\``);
    }

    // Lấy số nội dung
    const contentId = parseInt(args[1]);
    if (!contentId || isNaN(contentId)) {
      return message.reply(`❌ Vui lòng nhập số nội dung!\n\n📝 Ví dụ: \`!dm @ABC 1\`\n📋 Dùng \`!listdm\` để xem danh sách nội dung.`);
    }

    // Tìm nội dung theo ID
    const dmContent = dmContents.find(item => item.id === contentId);
    if (!dmContent) {
      return message.reply(`❌ Không tìm thấy nội dung #${contentId}!\n\n📋 Dùng \`!listdm\` để xem danh sách nội dung có sẵn.`);
    }

    // Gửi DM
    try {
      await userMention.send(dmContent.content);
      
      const embed = {
        title: "✅ ĐÃ GỬI DM THÀNH CÔNG!",
        color: 0x00ff00,
        fields: [
          { name: "👤 Người nhận", value: userMention.toString(), inline: true },
          { name: "🔢 Số nội dung", value: `#${contentId}`, inline: true },
          { name: "📝 Nội dung", value: dmContent.content.substring(0, 200) + (dmContent.content.length > 200 ? "..." : ""), inline: false },
          { name: "⏰ Thời gian", value: new Date().toLocaleString('vi-VN'), inline: true }
        ],
        timestamp: new Date()
      };
      
      await message.reply({ embeds: [embed] });
      console.log(`✅ ${message.author.tag} đã gửi DM #${contentId} cho ${userMention.tag}`);
      
    } catch (error) {
      console.error("Lỗi khi gửi DM:", error);
      
      let errorMsg = "❌ Không thể gửi DM! Nguyên nhân có thể:\n";
      if (error.code === 50007) {
        errorMsg += "• Người dùng đã tắt DM từ thành viên khác\n";
      } else if (error.code === 10003) {
        errorMsg += "• Không tìm thấy người dùng\n";
      } else {
        errorMsg += `• ${error.message}\n`;
      }
      errorMsg += "\n💡 Hãy đảm bảo người dùng đã bật chế độ nhận DM từ thành viên trong server!";
      
      await message.reply(errorMsg);
    }
  },

  // Xóa nội dung (tùy chọn thêm)
  async deleteDM(message, args, client) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ Bạn cần quyền **Administrator** để sử dụng lệnh này!");
    }

    const contentId = parseInt(args[0]);
    if (!contentId || isNaN(contentId)) {
      return message.reply(`❌ Cú pháp: \`!deletedm <số>\`\n\n📝 Ví dụ: \`!deletedm 1\``);
    }

    const index = dmContents.findIndex(item => item.id === contentId);
    if (index === -1) {
      return message.reply(`❌ Không tìm thấy nội dung #${contentId}!`);
    }

    const deletedContent = dmContents[index].content;
    dmContents.splice(index, 1);
    
    // Đánh số lại ID
    dmContents.forEach((item, idx) => {
      item.id = idx + 1;
    });
    
    saveDMContents();

    await message.reply(`✅ **ĐÃ XÓA NỘI DUNG #${contentId}**\n\n📝 Nội dung đã xóa: ${deletedContent.substring(0, 100)}${deletedContent.length > 100 ? '...' : ''}`);
  }
};