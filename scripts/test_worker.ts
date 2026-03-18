import { processDxfData } from '../src/components/CrystalViewer/dxfParser.worker';

console.log('\n[TEST STRATEGY] Testing DXF Parser Logic\n');

async function runTests() {
    // 1. 测试成功解析及安全边界
    console.log('[Test 1] Valid Input (5x8x5)');
    const resultSuccess = await processDxfData('mock:', [5, 8, 5]);

    if (resultSuccess.type === 'PARSE_SUCCESS' && resultSuccess.payload) {
        const { boundingSize, pointCount } = resultSuccess.payload;
        console.log(`✅ Success! Points: ${pointCount}`);

        // Check bounding size matches safety margin
        // Max bounds allowed: 5*0.9=4.5, 8*0.9=7.2, 5*0.9=4.5
        const isSafe = boundingSize[0] <= 4.501 && boundingSize[1] <= 7.201 && boundingSize[2] <= 4.501;

        if (isSafe) {
            console.log(`✅ Safe boundaries passed! Actual Bounding Box: [${boundingSize[0].toFixed(2)}, ${boundingSize[1].toFixed(2)}, ${boundingSize[2].toFixed(2)}]`);
        } else {
            console.error(`❌ Pierce boundaries! Expected less than [4.5, 7.2, 4.5], got [${boundingSize.join(', ')}]`);
            process.exit(1);
        }
    } else {
        console.error('❌ Expected success but got error:', resultSuccess.error);
        process.exit(1);
    }

    // 2. 测试边界防御 - 空URL
    console.log('\n[Test 2] Invalid URL Defense');
    const resultUrlEmpty = await processDxfData('', [5, 8, 5]);
    if (resultUrlEmpty.type === 'PARSE_ERROR') {
        console.log(`✅ Correctly caught empty URL error: ${resultUrlEmpty.error}`);
    } else {
        console.error('❌ Failed to catch empty URL');
        process.exit(1);
    }

    // 3. 测试边界防御 - 错误TargetSize
    console.log('\n[Test 3] Invalid TargetSize Defense');
    const resultSizeBad = await processDxfData('mock:', [-1, 8, 5] as any);
    if (resultSizeBad.type === 'PARSE_ERROR') {
        console.log(`✅ Correctly caught invalid targetSize error: ${resultSizeBad.error}`);
    } else {
        console.error('❌ Failed to catch invalid targetSize!');
        process.exit(1);
    }

    console.log('\n🎉 ALL TESTS PASSED!');
}

runTests();
