# 候选安装包与增量验收

当前安装入口：[INSTALL.md](INSTALL.md)。已有测试采用与剩余缺口：[验收记录](../docs/testing/ACCEPTANCE.md)。

已完成且适用于相同运行字节的云端或本机结果直接采用；无需重新安装或重复完整矩阵。仅执行尚未覆盖的平台／真实服务差异，修复后仅复验受影响路径。已开始的本机测试可适度收尾，提交已完成结果和剩余缺口。

当前文案包身份使用 [copyclarity-manifest.json](copyclarity-manifest.json)；原始包与 [manifest.json](manifest.json) 保留作为历史验收身份，两者不要混用 SHA。

## 介绍文案更新包 / Copy clarification package

新增独立文案包 [dsh-dots-1.0.10-uiqa.20261029.1-copyclarity.tgz](dsh-dots-1.0.10-uiqa.20261029.1-copyclarity.tgz)（15909 bytes），SHA256 `9ef0f7b5e501eb23814e0aec29c081314a07707972503c98c02a00fd2b96a466`。它更新 README、插件简介和界面说明；运行时代码字节不变。原始验收包和原清单保留，不使用旧 SHA 标识新文件。功能未变，本次仅做文案/包内容一致性核验。逐文件校验见 [copyclarity-manifest.json](copyclarity-manifest.json)。

Separate documentation-only package; the original acceptance archive and manifest remain unchanged. This is not a new functional test run or a Release.


