import fs from 'fs';

function replaceInFile(filePath: string) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Define the exact regex matches to replace
    // For PostCard.tsx and similar: ({!isAnonymous && (author?.role === 'administration' || author?.role === 'teacher') && (\s*<BadgeCheck className="w-5 h-5 fill-\[#1877F2\] text-white stroke-\[1.5px\]" \/>\s*)\})
    const re1 = /\{\!isAnonymous && \(author\?\.role === 'administration' \|\| author\?\.role === 'teacher'\) && \(\s*<BadgeCheck className="w-5 h-5 fill-\[#1877F2\] text-white stroke-\[1\.5px\]" \/>\s*\)\}/g;
    
    content = content.replace(re1, `{!isAnonymous && author?.role === 'administration' && (
                <BadgeCheck className="w-5 h-5 fill-[#1877F2] text-white stroke-[1.5px]" />
              )}
              {!isAnonymous && author?.role === 'teacher' && (
                <BadgeCheck className="w-5 h-5 fill-green-500 text-white stroke-[1.5px]" />
              )}`);

    const re2 = /\{\(commentAuthor\?\.role === 'administration' \|\| commentAuthor\?\.role === 'teacher'\) && \(\s*<BadgeCheck className="w-5 h-5 fill-\[#1877F2\] text-white stroke-\[1\.5px\]" \/>\s*\)\}/g;
    content = content.replace(re2, `{(commentAuthor?.role === 'administration') && (
              <BadgeCheck className="w-5 h-5 fill-[#1877F2] text-white stroke-[1.5px]" />
            )}
            {(commentAuthor?.role === 'teacher') && (
              <BadgeCheck className="w-5 h-5 fill-green-500 text-white stroke-[1.5px]" />
            )}`);

    const re3 = /\{\(user\.role === 'administration' \|\| user\.role === 'teacher'\) && \(\s*<BadgeCheck className="w-4 h-4 fill-\[#1877F2\] text-white stroke-\[2px\]" \/>\s*\)\}/g;
    content = content.replace(re3, `{(user.role === 'administration') && (
              <BadgeCheck className="w-4 h-4 fill-[#1877F2] text-white stroke-[2px]" />
            )}
            {(user.role === 'teacher') && (
              <BadgeCheck className="w-4 h-4 fill-green-500 text-white stroke-[2px]" />
            )}`);

    fs.writeFileSync(filePath, content, 'utf-8');
}

const files = [
    'src/components/PostCard.tsx',
    'src/components/PostDetail.tsx',
    'src/components/UserListModal.tsx',
    'src/components/SearchScreen.tsx'
];

files.forEach(f => replaceInFile(f));
