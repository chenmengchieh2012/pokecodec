import * as path from 'path';
import * as fs from 'fs';

const Mocha = require('mocha');

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true
    });

    const testsRoot = path.resolve(__dirname, '..');
    const testDir = path.join(testsRoot, 'test');

    return new Promise((c, e) => {
        try {
            if (fs.existsSync(testDir)) {
                const files = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));

                files.forEach(f => {
                    mocha.addFile(path.join(testDir, f));
                });

                try {
                    // Run the mocha test
                    mocha.run((failures: number) => {
                        if (failures > 0) {
                            e(new Error(`${failures} tests failed.`));
                        } else {
                            c();
                        }
                    });
                } catch (err) {
                    console.error(err);
                    e(err);
                }
            } else {
                e(new Error('Test dir not found'));
            }
        } catch (err) {
            console.error('Error finding files:', err);
            e(err);
        }
    });
}
