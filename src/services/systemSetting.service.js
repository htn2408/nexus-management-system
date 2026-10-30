// Tham số cấu hình hệ thống (bảng SystemSettings).
import * as systemSettingRepository from '../repositories/systemSetting.repository.js';

export function list() {
  return systemSettingRepository.findAll();
}

/** Có rồi thì chỉ đổi giá trị; chưa có thì tạo mới với category / dataType gửi kèm. */
export async function upsert(key, input) {
  const existing = await systemSettingRepository.findByKey(key);

  if (existing) {
    await systemSettingRepository.updateValue(key, input.settingValue);
  } else {
    await systemSettingRepository.insert({
      settingKey: key,
      settingValue: input.settingValue,
      category: input.category ?? 'General',
      dataType: input.dataType ?? 'string',
      description: input.description ?? null,
    });
  }

  return systemSettingRepository.findByKey(key);
}
