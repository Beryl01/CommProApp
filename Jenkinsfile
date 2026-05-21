pipeline {
    agent any

    environment {
        npm_config_cache = '/tmp/npm-cache'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Node.js') {
            steps {
                sh '''
                    if ! node --version 2>/dev/null | grep -q "v20"; then
                        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                        sudo apt install -y nodejs
                    fi
                    node --version
                    npm --version
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci --prefer-offline --no-audit'
            }
        }

        stage('Install Playwright Browsers') {
            steps {
                sh 'npx playwright install --with-deps chromium'
            }
        }

        stage('Run Playwright Tests') {
            steps {
                sh 'npx playwright test'
            }
            post {
                always {
                    publishHTML([
                        reportDir: 'playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright Report',
                        allowMissing: true,
                        keepAll: true,
                        alwaysLinkToLastBuild: true
                    ])
                }
            }
        }

        stage('Run API Tests (Newman)') {
            steps {
                sh '''
                    node api-tests/mock-server.cjs &
                    MOCK_PID=$!
                    sleep 2
                    npx newman run api-tests/CommSkillPro.postman_collection.json \
                      --env-var baseUrl=http://localhost:3001 \
                      --reporters cli,htmlextra \
                      --reporter-htmlextra-export newman-report/report.html
                    RESULT=$?
                    kill $MOCK_PID 2>/dev/null || true
                    exit $RESULT
                '''
            }
            post {
                always {
                    publishHTML([
                        reportDir: 'newman-report',
                        reportFiles: 'report.html',
                        reportName: 'API Test Report',
                        allowMissing: true,
                        keepAll: true,
                        alwaysLinkToLastBuild: true
                    ])
                }
            }
        }
    }

    post {
        success {
            echo '✅ All tests passed!'
        }
        failure {
            echo '❌ Some tests failed — check the reports!'
        }
    }
}
