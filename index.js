#!/usr/bin/env node

const { execSync } = require("child_process");
const degit = require("degit");
const path = require("path");
const url = require("url");

const args = process.argv.slice(2);

if (args.length < 2) {
    console.error("❌ Укажи репозиторий и имя проекта!");
    console.log("👉 Пример: npx cherry-repo user/repo my-app [--commit] [--path ./projects]");
    process.exit(1);
}

let REPO = args[0];
const PROJECT_NAME = args[1]; // папка назначения

// ищем флаг --path
let basePath = process.cwd();
const pathIndex = args.indexOf("--path");
if (pathIndex !== -1 && args[pathIndex + 1]) {
    basePath = path.resolve(args[pathIndex + 1]);
}

const TARGET_DIR = path.join(basePath, PROJECT_NAME);

// обработка формата репозитория
let repoName, branch;
if (REPO.startsWith("http")) {
    const [cleanUrl, branchName] = REPO.split("#");
    const parsed = url.parse(cleanUrl);
    const parts = parsed.pathname.replace(/\.git$/, "").split("/");
    repoName = `${parts[1]}/${parts[2]}`;
    branch = branchName || branch; // если ветка указана после #, берём её
} else {
    // user/repo#branch
    [repoName, branch = "master"] = REPO.split("#");
}

const branchIndex = args.indexOf("--branch");
if (branchIndex !== -1 && args[branchIndex + 1]) {
    branch = args[branchIndex + 1];
}

/**
 * Проверка, что ветка существует в удалённом репозитории
 */
function checkBranch(repo, branch) {
    try {
        const result = execSync(
            `git ls-remote --heads https://github.com/${repo}.git ${branch}`,
            { stdio: "pipe" }
        ).toString().trim();

        return result.length > 0; // если пусто → ветка не найдена
    } catch {
        return false;
    }
}

(async () => {
    console.log(`🔍 Проверяю ветку "${branch}" в репозитории ${repoName}...`);
    if (!checkBranch(repoName, branch)) {
        console.error(`❌ Ветка "${branch}" не найдена в репозитории ${repoName}`);
        process.exit(1);
    }

    console.log(`📥 Копирую ${repoName} (ветка: ${branch}) в ${TARGET_DIR}...`);
    const emitter = degit(`${repoName}#${branch}`, {
        cache: false,
        force: true,
        verbose: true,
    });

    await emitter.clone(TARGET_DIR);

    process.chdir(TARGET_DIR);

    console.log("🔧 Инициализация git...");
    execSync("git init", { stdio: "inherit" });
    execSync(`git branch -M ${branch}`, { stdio: "inherit" });

    console.log(`✅ Готово! Проект создан в папке ${TARGET_DIR}`);
})();
