
function stripQuotedText(text: string): string {
    if (!text) return "";
    
    const markers = [
        /^(?:\s*On\s+.*\s+wrote:|\s*Le\s+.*\s+a\s+écrit\s*:)/im,
        /^-*\s*(?:Original Message|Message d'origine)\s*-*/im,
        /^\s*From:\s+.*$/im,
        /^\s*De\s*:\s+.*$/im,
    ];

    for (const marker of markers) {
        const match = text.match(marker);
        if (match && match.index !== undefined) {
            return text.substring(0, match.index).trim();
        }
    }

    return text.trim();
}

const testEmails = [
    {
        name: "Standard Reply (French)",
        input: `Hi,

Thanks for your reply!

I’m thinking about coming in February. Is that a good time for beginners?

Also, I might travel alone — is your camp suitable for solo travelers?

Anna

Le mar. 24 mars 2026 à 12:43, <moh.chabba@gmail.com> a écrit :

> Hi Anna! 😊
>
> Yes, absolutely! We specialize in beginner surfers. Our **"Adrenalin
> Surf Lessons"** package is perfect for you.`,
        expected: `Hi,

Thanks for your reply!

I’m thinking about coming in February. Is that a good time for beginners?

Also, I might travel alone — is your camp suitable for solo travelers?

Anna`
    },
    {
        name: "Standard Reply (English)",
        input: `Hello,

I'm interested.

On Mon, Mar 23, 2026 at 10:00 AM Team <team@adrenalinsurfmaroc.com> wrote:
> Quoted content here`,
        expected: `Hello,

I'm interested.`
    },
    {
      name: "Original Message Pattern",
      input: `Looks good!

-----Original Message-----
From: Team
Sent: Monday, March 23, 2026
To: Anna
Subject: Re: Surf camp`,
      expected: `Looks good!`
    }
];

let failed = 0;
for (const test of testEmails) {
    const result = stripQuotedText(test.input);
    if (result === test.expected) {
        console.log(`✅ Passed: ${test.name}`);
    } else {
        console.log(`❌ Failed: ${test.name}`);
        console.log(`   Expected: [${test.expected}]`);
        console.log(`   Got:      [${result}]`);
        failed++;
    }
}

if (failed === 0) {
    console.log("\nAll tests passed! 🚀");
} else {
    console.log(`\n${failed} tests failed.`);
    process.exit(1);
}
