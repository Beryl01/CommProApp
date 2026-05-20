pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Node.js') {
            steps {
                sh '''
                    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                    sudo apt install -y nodejs
                    node --version
                    npm --version
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
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
                        keepAll: true
                    ])
                }
            }
        }

        stage('Run API Tests (Newman)') {
            steps {
                sh 'npm run test:api'
            }
            post {
                always {
                    publishHTML([
                        reportDir: 'newman-report',
                        reportFiles: 'report.html',
                        reportName: 'API Test Report',
                        allowMissing: true,
                        keepAll: true
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
