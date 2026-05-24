package io.commskillpro.api;

/*
 * REST Assured API tests — CommSkill Pro
 *
 * Dependencies (Maven):
 *   <dependency>
 *     <groupId>io.rest-assured</groupId>
 *     <artifactId>rest-assured</artifactId>
 *     <version>5.4.0</version>
 *     <scope>test</scope>
 *   </dependency>
 *   <dependency>
 *     <groupId>org.junit.jupiter</groupId>
 *     <artifactId>junit-jupiter</artifactId>
 *     <version>5.10.2</version>
 *     <scope>test</scope>
 *   </dependency>
 *
 * Gradle equivalent:
 *   testImplementation 'io.rest-assured:rest-assured:5.4.0'
 *   testImplementation 'org.junit.jupiter:junit-jupiter:5.10.2'
 *
 * Run:
 *   mvn test -Dtest=CommSkillProApiTest
 *
 * NOTE: Tests in the "happy path" groups call the live Claude API and consume
 * tokens. max_tokens is kept at 10–50 to minimise cost.
 */

import io.restassured.RestAssured;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@DisplayName("CommSkill Pro — API Tests")
class CommSkillProApiTest {

    private static final String BASE_URL   = "https://commproapp.netlify.app";
    private static final String PROXY_PATH = "/.netlify/functions/proxy";
    private static final String SLACK_PATH = "/.netlify/functions/slack";

    @BeforeAll
    static void configureRestAssured() {
        RestAssured.baseURI = BASE_URL;
        // The proxy function checks the Origin header against ALLOWED_ORIGIN.
        // Set it as a default so every request passes the origin guard.
        RestAssured.requestSpecification = new RequestSpecBuilder()
            .addHeader("Origin", BASE_URL)
            .build();
    }

    // -------------------------------------------------------------------------
    // Claude Proxy — /.netlify/functions/proxy
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Claude Proxy — /.netlify/functions/proxy")
    class ProxyTests {

        @Nested
        @DisplayName("Happy path")
        class HappyPath {

            @Test
            @DisplayName("conversation message returns 200 with content array")
            void conversationMessage_returns200_withContentArray() {
                String body = """
                        {
                          "model": "claude-haiku-4-5-20251001",
                          "max_tokens": 10,
                          "system": "You are a workplace communication coach. Reply in 5 words or fewer.",
                          "messages": [
                            { "role": "user", "content": "Give me one tip." }
                          ]
                        }
                        """;

                given()
                    .contentType(ContentType.JSON)
                    .body(body)
                .when()
                    .post(PROXY_PATH)
                .then()
                    .statusCode(200)
                    .body("role",                equalTo("assistant"))
                    .body("content",             not(empty()))
                    .body("content[0].text",     not(emptyOrNullString()));
            }

            @Test
            @DisplayName("scenario generation request returns 200 with content array")
            void scenarioGenerationRequest_returns200_withContentArray() {
                String body = """
                        {
                          "model": "claude-haiku-4-5-20251001",
                          "max_tokens": 50,
                          "system": "You generate workplace communication scenarios in JSON.",
                          "messages": [
                            {
                              "role": "user",
                              "content": "Generate 3 workplace scenarios for a Support Engineer practising handling escalations. Return only a JSON array."
                            }
                          ]
                        }
                        """;

                given()
                    .contentType(ContentType.JSON)
                    .body(body)
                .when()
                    .post(PROXY_PATH)
                .then()
                    .statusCode(200)
                    .body("content",         not(empty()))
                    .body("content[0].text", not(emptyOrNullString()));
            }

            @Test
            @DisplayName("scoring request returns 200 with content array")
            void scoringRequest_returns200_withContentArray() {
                String body = """
                        {
                          "model": "claude-haiku-4-5-20251001",
                          "max_tokens": 50,
                          "system": "You score workplace communication conversations. Return JSON with a level field.",
                          "messages": [
                            {
                              "role": "user",
                              "content": "FULL TRANSCRIPT:\\nUser: I hear you, let me look into this immediately.\\nScore this conversation."
                            }
                          ]
                        }
                        """;

                given()
                    .contentType(ContentType.JSON)
                    .body(body)
                .when()
                    .post(PROXY_PATH)
                .then()
                    .statusCode(200)
                    .body("content",         not(empty()))
                    .body("content[0].text", not(emptyOrNullString()));
            }

            @Test
            @DisplayName("response Content-Type is application/json")
            void response_hasJsonContentType() {
                String body = """
                        {
                          "model": "claude-haiku-4-5-20251001",
                          "max_tokens": 5,
                          "system": "Reply with one word.",
                          "messages": [{ "role": "user", "content": "Hi." }]
                        }
                        """;

                given()
                    .contentType(ContentType.JSON)
                    .body(body)
                .when()
                    .post(PROXY_PATH)
                .then()
                    .statusCode(200)
                    .contentType(containsString("application/json"));
            }
        }

        @Nested
        @DisplayName("Error handling")
        class ErrorHandling {

            @Test
            @DisplayName("invalid JSON body returns 400 with error.message")
            void invalidJsonBody_returns400() {
                given()
                    .contentType(ContentType.JSON)
                    .body("this is not valid json { broken")
                .when()
                    .post(PROXY_PATH)
                .then()
                    .statusCode(400)
                    .body("error.message", equalTo("Invalid JSON body"));
            }

            @Test
            @DisplayName("empty string body returns 400 with error.message")
            void emptyStringBody_returns400() {
                given()
                    .contentType(ContentType.JSON)
                    .body("")
                .when()
                    .post(PROXY_PATH)
                .then()
                    .statusCode(400)
                    .body("error.message", equalTo("Invalid JSON body"));
            }

            @Test
            @DisplayName("GET request returns 405 Method Not Allowed")
            void getRequest_returns405() {
                given()
                .when()
                    .get(PROXY_PATH)
                .then()
                    .statusCode(405);
            }

            @Test
            @DisplayName("PUT request returns 405 Method Not Allowed")
            void putRequest_returns405() {
                given()
                    .contentType(ContentType.JSON)
                    .body("{}")
                .when()
                    .put(PROXY_PATH)
                .then()
                    .statusCode(405);
            }

            @Test
            @DisplayName("missing messages field — proxy forwards to Claude, does not 500 crash")
            void missingMessagesField_doesNotCrash() {
                String body = """
                        {
                          "model": "claude-haiku-4-5-20251001",
                          "max_tokens": 10
                        }
                        """;

                Response response =
                    given()
                        .contentType(ContentType.JSON)
                        .body(body)
                    .when()
                        .post(PROXY_PATH);

                // The proxy passes through to Claude; Claude may return 400.
                // What must NOT happen is a 500 from an unhandled crash in the function itself.
                response.then()
                    .contentType(containsString("application/json"))
                    .statusCode(not(equalTo(500)));
            }
        }
    }

    // -------------------------------------------------------------------------
    // Slack Relay — /.netlify/functions/slack
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Slack Relay — /.netlify/functions/slack")
    class SlackTests {

        @Nested
        @DisplayName("Happy path")
        class HappyPath {

            @Test
            @DisplayName("plain text message returns 200 with ok:true")
            void plainTextMessage_returns200_withOkTrue() {
                String body = """
                        {
                          "text": "CommSkill Pro — REST Assured API test ping"
                        }
                        """;

                given()
                    .contentType(ContentType.JSON)
                    .body(body)
                .when()
                    .post(SLACK_PATH)
                .then()
                    .statusCode(200)
                    .body("ok", equalTo(true));
            }

            @Test
            @DisplayName("Block Kit payload returns 200 with ok:true")
            void blockKitPayload_returns200_withOkTrue() {
                String body = """
                        {
                          "blocks": [
                            {
                              "type": "header",
                              "text": { "type": "plain_text", "text": "CommSkill Pro — API Test", "emoji": true }
                            },
                            {
                              "type": "section",
                              "text": {
                                "type": "mrkdwn",
                                "text": "*Status:* \\u2705 REST Assured test run\\n*Environment:* Production"
                              }
                            }
                          ]
                        }
                        """;

                given()
                    .contentType(ContentType.JSON)
                    .body(body)
                .when()
                    .post(SLACK_PATH)
                .then()
                    .statusCode(200)
                    .body("ok", equalTo(true));
            }

            @Test
            @DisplayName("response Content-Type is application/json")
            void response_hasJsonContentType() {
                given()
                    .contentType(ContentType.JSON)
                    .body("{ \"text\": \"content-type check\" }")
                .when()
                    .post(SLACK_PATH)
                .then()
                    .statusCode(200)
                    .contentType(containsString("application/json"));
            }

            @Test
            @DisplayName("response body contains only the ok field")
            void successResponseContainsOnlyOkField() {
                given()
                    .contentType(ContentType.JSON)
                    .body("{ \"text\": \"field count check\" }")
                .when()
                    .post(SLACK_PATH)
                .then()
                    .statusCode(200)
                    .body("ok",    equalTo(true))
                    .body("error", nullValue());
            }
        }

        @Nested
        @DisplayName("Error handling")
        class ErrorHandling {

            @Test
            @DisplayName("invalid JSON body returns 400 with error field")
            void invalidJsonBody_returns400() {
                given()
                    .contentType(ContentType.JSON)
                    .body("not valid json at all")
                .when()
                    .post(SLACK_PATH)
                .then()
                    .statusCode(400)
                    .body("error", equalTo("Invalid JSON body"));
            }

            @Test
            @DisplayName("empty string body returns 400 with error field")
            void emptyStringBody_returns400() {
                given()
                    .contentType(ContentType.JSON)
                    .body("")
                .when()
                    .post(SLACK_PATH)
                .then()
                    .statusCode(400)
                    .body("error", equalTo("Invalid JSON body"));
            }

            @Test
            @DisplayName("GET request returns 405 Method Not Allowed")
            void getRequest_returns405() {
                given()
                .when()
                    .get(SLACK_PATH)
                .then()
                    .statusCode(405);
            }

            @Test
            @DisplayName("PUT request returns 405 Method Not Allowed")
            void putRequest_returns405() {
                given()
                    .contentType(ContentType.JSON)
                    .body("{}")
                .when()
                    .put(SLACK_PATH)
                .then()
                    .statusCode(405);
            }

            @Test
            @DisplayName("DELETE request returns 405 Method Not Allowed")
            void deleteRequest_returns405() {
                given()
                .when()
                    .delete(SLACK_PATH)
                .then()
                    .statusCode(405);
            }
        }
    }
}
